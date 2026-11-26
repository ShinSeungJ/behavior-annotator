# Behavior Annotator

A web-based tool for labeling animal behaviors in videos, frame by frame, as start–end intervals.

Live: https://shinseungj.github.io/behavior-annotator/

## Features

### 🎬 Video Playback
- Load a video and step through it frame by frame
- Adjustable frame rate (FPS, default 30) and frame step interval (ms) for held arrow keys
- Zoom with buttons, keys or the mouse wheel, and pan by dragging
- Click anywhere on the timeline slider to jump to a frame

### 🏷️ Behavior Intervals
- Mark a start frame (S) and end frame (E), then press a number key to save the interval with that behavior
- Edit the behavior of any saved interval, or delete it
- Click an interval's frame range to jump to it in the video
- Paginated interval list, sorted by start frame (latest first)

### 📊 Behavior Timeline
- Color-coded bar under the video showing every labeled interval
- Legend for each behavior; click a segment to jump to its start

### ⚙️ Behavior Settings
- Default behaviors: supported rearing, unsupported rearing, grooming, freezing, jumping
- Add, rename, delete and reorder behaviors (arrows or by typing a new position)
- Renaming a behavior updates all intervals that use it
- Number keys follow the order in the list (up to 9 behaviors)

### 💾 Export
- **Save CSV** downloads a ZIP with `<video name>_intervals.csv`
- Columns: `type, start_time, end_time, start_frame, end_frame, behavior`

### 🌗 Light and Dark Mode
- Toggle with the icon in the top-right corner

## Getting Started

1. **Select Video**: choose a video file
2. **Set FPS**: enter the video's frame rate so frame numbers and times are correct
3. **Label**: move to the start of a behavior and press **S**, move to the end and press **E**, then press the behavior's number key
4. **Export**: click **Save CSV**

## Keyboard Shortcuts

- **→ / ←**: Next / previous frame (hold to keep moving; after S, releasing the key sets the end frame)
- **S**: Mark start frame
- **E**: Update end frame
- **1–9**: Save the current interval with that behavior
- **+ / -**: Zoom in / out
- **0**: Reset zoom

The **Shortcuts** button next to Behavior Intervals shows this list in the app.

## Development

Built with React (Create React App) and Material UI.

### Key Dependencies
- **@mui/material**: UI components
- **papaparse**: CSV generation
- **jszip** and **file-saver**: ZIP export

### Running Locally
```bash
npm install
npm start
```

### Deploying
```bash
npm run deploy
```
Builds the app and publishes the `build/` folder to the `gh-pages` branch, which GitHub Pages serves.

## Browser Requirements
- A modern browser that can play the video's format (MP4 H.264 works everywhere)
- On Safari, browser zoom shortcuts (Cmd +/-) still work alongside the app's zoom keys
