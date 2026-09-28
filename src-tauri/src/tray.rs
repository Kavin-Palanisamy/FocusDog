use std::sync::Arc;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::TrayIconBuilder;
use tauri::Emitter;

use crate::patrol::PatrolController;
use crate::pet_window::show_settings;

pub fn setup_tray(
    app: &tauri::AppHandle,
    patrol_ctrl: Arc<PatrolController>,
) -> Result<(), Box<dyn std::error::Error>> {
    let title_item = MenuItem::with_id(app, "title", "ðŸ¶ FocusDog v0.1.0", false, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let settings_item =
        MenuItem::with_id(app, "open_settings", "Open Settings", true, None::<&str>)?;
    let pause_item =
        MenuItem::with_id(app, "toggle_patrol", "Pause Patrol", true, None::<&str>)?;
    let snooze_item = MenuItem::with_id(app, "snooze", "Snooze", true, None::<&str>)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[
            &title_item,
            &sep1,
            &settings_item,
            &pause_item,
            &snooze_item,
            &sep2,
            &quit_item,
        ],
    )?;

    let icon = app.default_window_icon().cloned();
    let mut builder = TrayIconBuilder::new().menu(&menu);
    if let Some(ic) = icon {
        builder = builder.icon(ic);
    }

    let ctrl = Arc::clone(&patrol_ctrl);
    builder
        .show_menu_on_left_click(true)
        .on_menu_event(move |app, event| match event.id().as_ref() {
            "open_settings" => {
                show_settings(app);
            }
            "toggle_patrol" => {
                let paused = ctrl.paused.load(std::sync::atomic::Ordering::SeqCst);
                ctrl.paused.store(!paused, std::sync::atomic::Ordering::SeqCst);
            }
            "snooze" => {
                let _ = app.emit("snooze-triggered", ());
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}
