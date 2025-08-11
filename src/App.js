import React, { useRef, useState, useEffect } from "react";
import {
  Button, Select, MenuItem, Box, Typography, Grid,
  Table, TableHead, TableRow, TableCell, TableBody,
  TextField, FormControl, InputLabel, Slider, IconButton
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import Papa from "papaparse";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const behaviors = ["attacking", "jumping", "unsupported rearing", "supported rearing", "grooming", "freezing"];
const rowsPerPage = 15;

function App() {
  const [intervals, setIntervals] = useState([]);
  const [intervalStartFrame, setIntervalStartFrame] = useState("");
  const [intervalEndFrame, setIntervalEndFrame] = useState("");
  const [intervalBehavior, setIntervalBehavior] = useState(behaviors[0]);

  const [page, setPage] = useState(0);
  const [frameRate, setFrameRate] = useState(30); // Default FPS set to 30
  const [frameInterval, setFrameInterval] = useState(100); // Frame transition interval in ms
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentFrame, setCurrentFrame] = useState(0);
  const currentFrameRef = useRef(0);
  const [markStart, setMarkStart] = useState(null);
  const [isAddingInterval, setIsAddingInterval] = useState(false);
  const [themeMode, setThemeMode] = useState("dark");
  const [arrowPressed, setArrowPressed] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [videoFileName, setVideoFileName] = useState("");

  const videoRef = useRef(null);
  const frameIntervalRef = useRef(null);
  const videoContainerRef = useRef(null);

  const theme = createTheme({
    palette: {
      mode: themeMode,
      ...(themeMode === "dark" ? {
        background: { 
          default: "#2d2d2d", // Brighter dark gray for main background
          paper: "#3a3a3a"    // Slightly lighter dark gray for cards/papers
        },
        text: { 
          primary: "#e0e0e0",   // Brighter text for better readability
          secondary: "#b0b0b0"  // Secondary text color
        },
        primary: { main: "#e7657cff" },
        divider: "#4a4a4a",     // Dark gray dividers
      } : {
        background: { default: "#ffffff", paper: "#ffffff" },
        text: { primary: "#000000", secondary: "#666666" },
        primary: { main: "#e7657cff" },
        divider: "#e0e0e0",
      }),
    },
    components: {
      // Ensure dark theme is applied to borders and other components
      ...(themeMode === "dark" && {
        MuiCssBaseline: {
          styleOverrides: {
            body: {
              backgroundColor: "#2d2d2d",
              margin: 0,
              padding: 0,
            },
            html: {
              backgroundColor: "#2d2d2d",
            }
          },
        },
        MuiTextField: {
          styleOverrides: {
            root: {
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: '#5a5a5a',
                },
                '&:hover fieldset': {
                  borderColor: '#7a7a7a',
                },
              },
            },
          },
        },
        MuiButton: {
          styleOverrides: {
            outlined: {
              borderColor: '#5a5a5a',
              '&:hover': {
                borderColor: '#7a7a7a',
              },
            },
          },
        },
      }),
    },
  });

  const toggleTheme = () => {
    setThemeMode(prev => (prev === "light" ? "dark" : "light"));
  };

  // Apply background color to body element immediately
  useEffect(() => {
    const backgroundColor = themeMode === "dark" ? "#2d2d2d" : "#ffffff";
    document.body.style.backgroundColor = backgroundColor;
    document.documentElement.style.backgroundColor = backgroundColor;
    
    return () => {
      // Clean up on unmount
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, [themeMode]);

  function onFileChange(e) {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
      alert("Please select a video.");
      return;
    }

    const file = files[0];
    if (!file.type.startsWith("video/")) {
      alert("Only video files can be selected.");
      return;
    }
    console.log("Video file selected:", file.name, "Type:", file.type);
    
    // Store the original file name (without extension) for CSV naming
    const fileNameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
    setVideoFileName(fileNameWithoutExtension);

    // Create blob URL directly from the file
    const videoUrl = URL.createObjectURL(file);
    setVideoUrl(videoUrl);
    
    // Reset all states for new video
    setCurrentTime(0);
    setCurrentFrame(0);
    currentFrameRef.current = 0;
    setIntervals([]);
    setMarkStart(null);
    setIntervalStartFrame("");
    setIntervalEndFrame("");
    setPage(0);
    setZoom(1);
    setPanX(0);
    setPanY(0);
    
    console.log("Video loaded successfully:", file.name);
  }

  useEffect(() => {
    if (videoUrl && videoRef.current) {
      console.log("Setting video src:", videoUrl);
      videoRef.current.src = videoUrl;
      videoRef.current.load();
      videoRef.current.onloadedmetadata = () => {
        console.log("Video metadata loaded, duration:", videoRef.current.duration);
        setVideoDuration(videoRef.current.duration);
      };
      videoRef.current.onerror = (e) => {
        console.error("Video error:", e);
        alert("Video playback failed: Please check the converted MP4 file.");
      };
    }
    return () => {
      if (videoRef.current) {
        console.log("Cleaning up videoRef");
        videoRef.current.onloadedmetadata = null;
        videoRef.current.onerror = null;
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isInInputField = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.contentEditable === 'true'
      );
      
      // If user is typing in an input field, don't interfere with keyboard input
      if (isInInputField) {
        return;
      }
      
      // Only prevent default for our shortcuts, not for input fields
      if (isAddingInterval) return;
      
      if (e.code === "KeyS") {
        e.preventDefault();
        markIntervalStart();
      } else if (e.code === "KeyE") {
        e.preventDefault();
        markIntervalEnd();
      } else if (["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6"].includes(e.code)) {
        e.preventDefault();
        const behaviorIndex = parseInt(e.code.replace("Digit", "")) - 1;
        if (behaviorIndex < behaviors.length && markStart !== null && intervalEndFrame !== "") {
          setIsAddingInterval(true);
          const selectedBehavior = behaviors[behaviorIndex];
          console.log(`Behavior selected and interval added: ${selectedBehavior}`);
          setIntervalBehavior(selectedBehavior);
          addInterval(selectedBehavior);
        }
      } else if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
        e.preventDefault();
        setArrowPressed(e.code);
      } else if (e.code === "Equal" || e.code === "NumpadAdd") { // + key for zoom in
        e.preventDefault();
        zoomIn();
      } else if (e.code === "Minus" || e.code === "NumpadSubtract") { // - key for zoom out
        e.preventDefault();
        zoomOut();
      } else if (e.code === "Digit0" || e.code === "Numpad0") { // 0 key for reset zoom
        e.preventDefault();
        resetZoom();
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "ArrowRight" || e.code === "ArrowLeft") {
        setArrowPressed(null);
        if (markStart !== null) {
          markIntervalEnd();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [markStart, intervalEndFrame, isAddingInterval]);

  useEffect(() => {
    currentFrameRef.current = currentFrame;
  }, [currentFrame]);

  useEffect(() => {
    if (arrowPressed) {
      const moveFrame = () => {
        if (!videoRef.current) return;
        const direction = arrowPressed === "ArrowRight" ? 1 : -1;
        const newFrame = currentFrameRef.current + direction;
        const newTime = newFrame / frameRate;
        if (newTime >= 0 && newTime <= videoDuration) {
          setCurrentTime(newTime);
          setCurrentFrame(newFrame);
          currentFrameRef.current = newFrame;
          videoRef.current.currentTime = newTime;
          console.log(`Moved to frame: ${newFrame}, time: ${newTime.toFixed(2)}s`);
        }
        frameIntervalRef.current = setTimeout(moveFrame, frameInterval);
      };
      frameIntervalRef.current = setTimeout(moveFrame, frameInterval);
    } else {
      if (frameIntervalRef.current) {
        clearTimeout(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    }
    return () => {
      if (frameIntervalRef.current) {
        clearTimeout(frameIntervalRef.current);
      }
    };
  }, [arrowPressed, frameRate, videoDuration, frameInterval]);

  useEffect(() => {
    if (isAddingInterval) {
      setIsAddingInterval(false);
    }
  }, [intervals]);

  // Mouse event handlers for zoom and pan
  useEffect(() => {
    const handleGlobalMouseMove = (e) => handleMouseMove(e);
    const handleGlobalMouseUp = () => handleMouseUp();

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart.x, dragStart.y]);

  function handleTimeUpdate() {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    const newFrame = Math.round(time * frameRate);
    setCurrentFrame(newFrame);
    currentFrameRef.current = newFrame;
  }

  function handleSliderChange(event, newValue) {
    const newTime = newValue / frameRate;
    setCurrentTime(newTime);
    setCurrentFrame(newValue);
    currentFrameRef.current = newValue;
    if (videoRef.current) {
      console.log("Slider changed, setting video frame:", newValue);
      videoRef.current.currentTime = newTime;
    }
  }

  function moveNextFrame() {
    const newFrame = currentFrame + 1;
    const newTime = newFrame / frameRate;
    if (newTime <= videoDuration) {
      setCurrentTime(newTime);
      setCurrentFrame(newFrame);
      currentFrameRef.current = newFrame;
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
        console.log(`Next frame: ${newFrame}, time: ${newTime.toFixed(2)}s`);
      }
    }
  }

  function movePrevFrame() {
    const newFrame = currentFrame - 1;
    const newTime = newFrame / frameRate;
    if (newTime >= 0) {
      setCurrentTime(newTime);
      setCurrentFrame(newFrame);
      currentFrameRef.current = newFrame;
      if (videoRef.current) {
        videoRef.current.currentTime = newTime;
        console.log(`Previous frame: ${newFrame}, time: ${newTime.toFixed(2)}s`);
      }
    }
  }

  // Zoom functions
  function zoomIn() {
    setZoom(prev => Math.min(prev * 1.5, 5)); // Max zoom 5x
  }

  function zoomOut() {
    setZoom(prev => Math.max(prev / 1.5, 0.5)); // Min zoom 0.5x
  }

  function resetZoom() {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }

  function handleWheel(e) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * delta, 0.5), 5));
  }

  function handleMouseDown(e) {
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  }

  function handleMouseMove(e) {
    if (!isDragging) return;
    setPanX(e.clientX - dragStart.x);
    setPanY(e.clientY - dragStart.y);
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  function markIntervalStart() {
    setMarkStart(currentFrameRef.current);
    setIntervalStartFrame(currentFrameRef.current);
    setIntervalEndFrame("");
    console.log("Interval start marked:", currentFrameRef.current);
  }

  function markIntervalEnd() {
    if (markStart === null) {
      alert("Please mark the start frame first.");
      return;
    }
    setIntervalEndFrame(currentFrameRef.current);
    console.log("Interval end updated:", currentFrameRef.current);
  }

  function addInterval(behavior) {
    const startFrame = parseInt(intervalStartFrame);
    const endFrame = parseInt(intervalEndFrame);
    const startTime = startFrame / frameRate;
    const endTime = endFrame / frameRate;
    const maxFrame = Math.round(videoDuration * frameRate);
    if (isNaN(startFrame) || isNaN(endFrame)) {
      alert("Start and end frames must be valid numbers.");
      setIsAddingInterval(false);
      return;
    }
    if (startFrame < 0 || endFrame > maxFrame) {
      alert(`Frames must be between 0 and ${maxFrame}.`);
      setIsAddingInterval(false);
      return;
    }
    if (startFrame >= endFrame) {
      alert("Start frame must be less than end frame.");
      setIsAddingInterval(false);
      return;
    }
    setIntervals(prev => [
      ...prev,
      { start: startFrame, end: endFrame, startTime, endTime, behavior, auto: false },
    ]);
    setIntervalStartFrame("");
    setIntervalEndFrame("");
    setIntervalBehavior(behaviors[0]);
    setMarkStart(null);
    setPage(0);
    console.log("Interval added:", { start: startFrame, end: endFrame, startTime, endTime, behavior });
  }

  function updateIntervalBehavior(idx, newBehavior) {
    setIntervals(prev =>
      prev.map((interval, i) =>
        i === idx ? { ...interval, behavior: newBehavior } : interval
      )
    );
    console.log("Interval behavior updated:", { idx, behavior: newBehavior });
  }

  function removeInterval(idx) {
    setIntervals(intervals.filter((_, i) => i !== idx));
    if (page * rowsPerPage >= intervals.length - 1) {
      setPage(Math.max(0, page - 1));
    }
  }

  function downloadCsvAll() {
    const zip = new JSZip();
    const intervalData = intervals.map(i => ({
      type: "interval",
      start_time: i.startTime.toFixed(2),
      end_time: i.endTime.toFixed(2),
      start_frame: i.start,
      end_frame: i.end,
      behavior: i.behavior,
    }));
    const intervalCsv = Papa.unparse(intervalData);
    
    // Use video file name for CSV and ZIP naming
    const baseFileName = videoFileName || "behavior_labels";
    const csvFileName = `${baseFileName}_intervals.csv`;
    const zipFileName = `${baseFileName}_behavior_labels.zip`;
    
    zip.file(csvFileName, intervalCsv);
    zip.generateAsync({ type: "blob" }).then(blob => {
      saveAs(blob, zipFileName);
    });
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ 
        minHeight: '100vh', 
        bgcolor: 'background.default', 
        color: 'text.primary',
        p: 2
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom>Behavior Labeling Tool</Typography>
          <IconButton onClick={toggleTheme} color="inherit" aria-label="Toggle theme">
            {themeMode === "light" ? <Brightness4Icon /> : <Brightness7Icon />}
          </IconButton>
        </Box>
        <Box sx={{ my: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
          <Box>
            <Typography variant="body2" gutterBottom>Select Video</Typography>
            <input
              type="file"
              accept="video/*"
              onChange={onFileChange}
              aria-label="Select video file"
            />
          </Box>
          <TextField
            label="Frame Rate (FPS)"
            type="number"
            value={frameRate}
            onChange={(e) => {
              setFrameRate(e.target.value);
            }}
            onBlur={() => {
              const numValue = parseFloat(frameRate);
              if (isNaN(numValue) || numValue < 1) {
                setFrameRate(30);
              } else {
                setFrameRate(numValue);
              }
            }}
            size="small"
            inputProps={{ min: 1, step: 1 }}
            aria-label="Frame rate"
            sx={{ width: '150px' }}
          />
          <TextField
            label="Frame Interval (ms)"
            type="number"
            value={frameInterval}
            onChange={(e) => {
              setFrameInterval(e.target.value);
            }}
            onBlur={() => {
              const numValue = parseInt(frameInterval);
              if (isNaN(numValue) || numValue < 10) {
                setFrameInterval(100);
              } else {
                setFrameInterval(numValue);
              }
            }}
            size="small"
            inputProps={{ min: 10, step: 10 }}
            aria-label="Frame transition interval"
            sx={{ width: '150px' }}
          />
          <Button
            onClick={downloadCsvAll}
            variant="contained"
            color="primary"
            aria-label="Save CSV"
          >
            Save CSV
          </Button>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="h6">Video</Typography>
            {!videoUrl ? (
              <Box
                sx={{
                  width: "100%",
                  maxWidth: "800px",
                  height: "450px",
                  bgcolor: 'background.paper',
                  border: 1,
                  borderColor: 'divider',
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: 'text.secondary',
                  fontSize: "1.2rem",
                  borderRadius: "4px",
                }}
                aria-label="Video placeholder"
              >
                Please upload a video
              </Box>
            ) : (
                              <Box
                  ref={videoContainerRef}
                  sx={{
                    width: "100%",
                    maxWidth: "800px",
                    height: "450px",
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: "4px",
                    overflow: "hidden",
                    position: "relative",
                    cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default'),
                    backgroundColor: '#000'
                  }}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                >
                <video
                  ref={videoRef}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    transform: `scale(${zoom}) translate(${panX / zoom}px, ${panY / zoom}px)`,
                    transformOrigin: "center center",
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out'
                  }}
                  onTimeUpdate={handleTimeUpdate}
                />
              </Box>
            )}
            {videoUrl && (
              <>
                <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={movePrevFrame}
                    aria-label="Previous frame"
                  >
                    Prev Frame
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={moveNextFrame}
                    aria-label="Next frame"
                  >
                    Next Frame
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={markIntervalStart}
                    aria-label="Mark start frame"
                  >
                    Mark Start (S)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={markIntervalEnd}
                    aria-label="Mark end frame"
                  >
                    Mark End (E)
                  </Button>
                  <Typography>
                    Current Frame: {currentFrame} / {Math.round(videoDuration * frameRate)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={zoomIn}
                    aria-label="Zoom in"
                  >
                    Zoom In (+)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={zoomOut}
                    aria-label="Zoom out"
                  >
                    Zoom Out (-)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={resetZoom}
                    aria-label="Reset zoom"
                  >
                    Reset Zoom
                  </Button>
                  <Typography variant="body2">
                    Zoom: {Math.round(zoom * 100)}%
                  </Typography>
                  <Typography variant="caption" sx={{ ml: 2 }}>
                    Mouse wheel to zoom, click and drag to pan
                  </Typography>
                </Box>
                <Slider
                  value={currentFrame}
                  min={0}
                  max={Math.round(videoDuration * frameRate)}
                  step={1}
                  onChange={handleSliderChange}
                  aria-label="Video frame timeline"
                  sx={{ mt: 2 }}
                />
              </>
            )}
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ 
              p: 2, 
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 1, 
              bgcolor: 'background.paper', 
              height: '100%' 
            }}>
              <Typography variant="h6" gutterBottom>Behavior Intervals</Typography>
              <Typography variant="body2" gutterBottom>
                Shortcuts: ArrowRight/ArrowLeft to navigate and mark end, S to mark start, E to update end, 1-6 to select behavior and add interval, +/- to zoom, 0 to reset zoom
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  label="Start Frame"
                  type="number"
                  value={intervalStartFrame}
                  onChange={(e) => {
                    const v = e.target.value;
                    console.log("Start Frame input:", v);
                    setIntervalStartFrame(v);
                    if (v !== "") setMarkStart(Number(v));
                    else setMarkStart(null);
                  }}
                  size="small"
                  inputProps={{ min: 0, step: 1 }}
                  aria-label="Interval start frame"
                />
                <TextField
                  label="End Frame"
                  type="number"
                  value={intervalStartFrame !== "" ? intervalEndFrame : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    console.log("End Frame input:", v);
                    setIntervalEndFrame(v);
                  }}
                  size="small"
                  inputProps={{ min: intervalStartFrame !== "" ? Number(intervalStartFrame) : 0, step: 1 }}
                  aria-label="Interval end frame"
                  disabled={intervalStartFrame === ""}
                />
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Behavior</InputLabel>
                  <Select
                    value={intervalBehavior}
                    label="Behavior"
                    onChange={(e) => setIntervalBehavior(e.target.value)}
                  >
                    {behaviors.map((b, i) => (
                      <MenuItem key={b} value={b}>{`${b} (${i + 1})`}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  onClick={() => addInterval(intervalBehavior)}
                  variant="contained"
                  aria-label="Add interval"
                  disabled={intervalStartFrame === "" || intervalEndFrame === ""}
                >
                  Add
                </Button>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Interval (Frame)</TableCell>
                    <TableCell>Behavior</TableCell>
                    <TableCell>Delete</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {intervals.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        No intervals added yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    intervals
                      .slice()
                      .sort((a, b) => b.start - a.start)
                      .slice(page * rowsPerPage, (page + 1) * rowsPerPage)
                      .map((interval, i) => (
                        <TableRow key={i}>
                          <TableCell>{`${interval.start} - ${interval.end}`}</TableCell>
                          <TableCell>
                            <FormControl size="small" sx={{ minWidth: 200 }}>
                              <InputLabel>Behavior</InputLabel>
                              <Select
                                value={interval.behavior}
                                label="Behavior"
                                onChange={(e) => updateIntervalBehavior(intervals.indexOf(interval), e.target.value)}
                              >
                                {behaviors.map((b, j) => (
                                  <MenuItem key={b} value={b}>{`${b} (${j + 1})`}</MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => removeInterval(intervals.indexOf(interval))}
                              aria-label={`Delete interval ${i + 1}`}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
              {intervals.length > rowsPerPage && (
                <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                  <Button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    variant="outlined"
                    aria-label="Previous page"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * rowsPerPage >= intervals.length}
                    variant="outlined"
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                  <Typography>
                    Page {page + 1} / {Math.ceil(intervals.length / rowsPerPage)}
                  </Typography>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </ThemeProvider>
  );
}

export default App;