# Tauri + Vanilla TS

# FocusDog 🐕

FocusDog is a lightweight desktop productivity companion that helps users stay focused while working on their computer.

Instead of using traditional productivity tools that constantly interrupt the user with notifications, FocusDog introduces a virtual dog that lives on the desktop and reacts to the user's activity.

The dog stays on the desktop, wanders around the bottom of the screen, rests, sleeps, reacts to interaction, and becomes more active when the user spends too much time on distracting websites.

## 🎯 Goal

The goal of FocusDog is to make digital focus management feel more natural and engaging.

Rather than simply displaying warnings or blocking websites, FocusDog uses the presence and behavior of a virtual companion to encourage users to stay focused.

## ✨ Main Features

- 🐕 Interactive virtual dog desktop companion
- 🚶 Dog patrols along the bottom of the desktop
- 😴 Idle, sleeping, walking and reaction animations
- 🖱️ Click, double-click, drag and interaction support
- 🌐 Website-specific focus time limits
- ⏱️ Individual time allowance for different websites
- 🚫 Optional website blocking when the allowance is exhausted
- 😄 Dog reactions when a distraction limit is reached
- ⚙️ Dedicated settings interface
- 💾 Persistent user settings
- 🔔 System tray controls
- 🪟 Transparent, always-on-top desktop pet window
- 🎨 Customizable dog appearance and behavior
- 🔊 Optional interaction sounds

## 🧠 How It Works

FocusDog runs as a desktop application with two main components:

1. **Settings Window**
   - Configure focus rules
   - Manage website allowances
   - Customize the dog
   - Control patrol behavior

2. **Desktop Pet**
   - Displays the dog on the desktop
   - Handles animations and movement
   - Reacts to user interaction
   - Patrols the desktop
   - Responds when focus limits are reached

The application keeps website usage allowances separately and monitors whether a configured website is currently being used. When an allowance is exhausted, the dog can respond according to the user's selected patrol rule.

## 🛠️ Technology

FocusDog is built using:

- **Tauri 2**
- **React**
- **TypeScript**
- **Rust**
- **HTML/CSS**
- **Windows Win32 APIs**
- **Canvas-based animation**
- **Local JSON configuration**

## 🖥️ Platform

### Current

- Windows Desktop

### Planned

- Android

The architecture is designed so that the core FocusDog experience can eventually be adapted for mobile devices.

## 🎨 Design Philosophy

FocusDog is designed around three principles:

### Simple

The application should be easy to configure and should stay out of the user's way.

### Playful

The virtual dog provides personality through movement, animation and body language rather than constant notifications.

### Focused

The purpose of the dog is to support productive computer usage without turning the application itself into another distraction.

## 🔒 Privacy

FocusDog is designed to keep user settings locally on the device.

The application does not need to send browsing activity to a remote server for its core focus-management functionality.

## 🚧 Project Status

FocusDog is currently under active development.

The core desktop pet, settings system, animation engine, website focus tracking and patrol behavior are being developed incrementally.

Future development will focus on:

- More natural dog animations
- Additional interactions
- Improved website detection
- More intelligent dog behavior
- Better Windows integration
- Mobile version
- Additional customization options

## 📌 Project Vision

FocusDog aims to turn productivity management into a small, enjoyable interaction with a virtual companion.

Instead of asking:

> "Why am I distracted?"

FocusDog is designed to make the desktop itself gently remind you:

> "Let's get back to work." 🐕
