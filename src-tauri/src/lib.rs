use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        // HTTP 요청을 웹뷰가 아니라 Rust 로 내보내 브라우저 CORS 를 우회한다.
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_clipboard_manager::init());

    // 자동 업데이트는 데스크톱에서만 등록한다.
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_updater::Builder::new().build());
    }

    builder
        .invoke_handler(tauri::generate_handler![db_sync])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}

#[tauri::command]
async fn db_sync(app: tauri::AppHandle, direction: String) -> Result<String, String> {
    if direction != "pull" && direction != "push" {
        return Err("지원하지 않는 동기화 방향입니다.".to_string());
    }

    let resource_script = app
        .path()
        .resource_dir()
        .map_err(|error| error.to_string())?
        .join("db-sync.sh");
    let dev_script = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("..")
        .join("scripts")
        .join("db-sync.sh");
    let script = if resource_script.exists() { resource_script } else { dev_script };

    // pg_dump/pg_restore와 SSH는 수 초 이상 걸릴 수 있으므로 Tauri 메인
    // 스레드에서 실행하면 React가 busy 상태를 그리기 전에 창이 멈춘다.
    let output = tauri::async_runtime::spawn_blocking(move || {
        std::process::Command::new("bash")
            .arg(script)
            .arg(direction)
            .output()
            .map_err(|error| format!("동기화 도구를 실행할 수 없습니다: {error}"))
    })
    .await
    .map_err(|error| format!("동기화 작업을 실행할 수 없습니다: {error}"))??;
    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        let detail = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(if detail.is_empty() {
            "DB 동기화에 실패했습니다.".to_string()
        } else {
            detail
        })
    }
}
