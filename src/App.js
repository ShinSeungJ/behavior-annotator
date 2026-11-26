import React, { useRef, useState, useEffect } from "react";
import {
  Button, Select, MenuItem, Box, Typography, Grid,
  Table, TableHead, TableRow, TableCell, TableBody,
  TextField, FormControl, InputLabel, Slider, IconButton, Modal, Paper, Divider,
  Collapse, Accordion, AccordionSummary, AccordionDetails,
  Switch, FormControlLabel
} from "@mui/material";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Papa from "papaparse";
import JSZip from "jszip";
import { saveAs } from "file-saver";

const defaultBehaviors = ["supported rearing", "unsupported rearing", "grooming", "freezing", "jumping"];
// Dynamic rows per page based on behavior settings expansion
const getRowsPerPage = (behaviorSettingsExpanded) => behaviorSettingsExpanded ? 24 : 14;

function App() {
  const [behaviors, setBehaviors] = useState(defaultBehaviors);
  const [intervals, setIntervals] = useState([]);
  const [intervalStartFrame, setIntervalStartFrame] = useState("");
  const [intervalEndFrame, setIntervalEndFrame] = useState("");
  const [intervalBehavior, setIntervalBehavior] = useState(defaultBehaviors[0]);

  const [page, setPage] = useState(0);
  const [frameRate, setFrameRate] = useState(30); // Default FPS set to 30
  const [frameInterval, setFrameInterval] = useState(50); // Frame transition interval in ms
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
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [newBehaviorName, setNewBehaviorName] = useState("");
  const [editingBehaviorIndex, setEditingBehaviorIndex] = useState(-1);
  const [editingBehaviorName, setEditingBehaviorName] = useState("");
  const [behaviorSettingsExpanded, setBehaviorSettingsExpanded] = useState(false);
  const [editingNumberIndex, setEditingNumberIndex] = useState(-1);
  const [editingNumber, setEditingNumber] = useState("");

  // Generate consistent colors for behaviors
  const getBehaviorColor = (behaviorIndex) => {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#2E86AB', '#FFA07A', '#9B59B6',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
    ];
    return colors[behaviorIndex % colors.length];
  };

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
        primary: { main: "#9e9e9e" }, // Light grey for dark mode
        divider: "#4a4a4a",     // Dark gray dividers
      } : {
        background: { default: "#ffffff", paper: "#ffffff" },
        text: { primary: "#000000", secondary: "#666666" },
        primary: { main: "#ffffff" }, // White for light mode
        divider: "#e0e0e0",
      }),
    },
    components: {
      // Theme-specific component styles
      ...(themeMode === "dark" ? {
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
            text: {
              textTransform: 'none',
            },
            outlined: {
              textTransform: 'none',
              borderColor: '#5a5a5a',
              '&:hover': {
                borderColor: '#7a7a7a',
              },
            },
            contained: {
              textTransform: 'none',
              backgroundColor: '#9e9e9e',
              color: '#000000',
              '&:hover': {
                backgroundColor: '#bdbdbd',
              },
            },
          },
        },
      } : {
        MuiButton: {
          styleOverrides: {
            text: {
              textTransform: 'none',
              color: '#000000',
              '&:hover': {
                backgroundColor: '#f5f5f5',
              },
            },
            outlined: {
              textTransform: 'none',
              color: '#000000',
              borderColor: '#d0d0d0',
              '&:hover': {
                borderColor: '#a0a0a0',
                backgroundColor: '#f5f5f5',
              },
            },
            contained: {
              textTransform: 'none',
              backgroundColor: '#ffffff',
              color: '#000000',
              border: '1px solid #e0e0e0',
              '&:hover': {
                backgroundColor: '#f5f5f5',
                border: '1px solid #d0d0d0',
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

  // Behavior management functions
  const addBehavior = () => {
    if (newBehaviorName.trim() && !behaviors.includes(newBehaviorName.trim())) {
      setBehaviors([...behaviors, newBehaviorName.trim()]);
      setNewBehaviorName("");
    }
  };

  const deleteBehavior = (index) => {
    if (behaviors.length > 1) { // Keep at least one behavior
      const newBehaviors = behaviors.filter((_, i) => i !== index);
      setBehaviors(newBehaviors);
      // Update interval behavior if it was the deleted one
      if (intervalBehavior === behaviors[index]) {
        setIntervalBehavior(newBehaviors[0]);
      }
    }
  };

  const startEditingBehavior = (index) => {
    setEditingBehaviorIndex(index);
    setEditingBehaviorName(behaviors[index]);
  };

  const saveEditingBehavior = () => {
    if (editingBehaviorName.trim() && !behaviors.includes(editingBehaviorName.trim())) {
      const newBehaviors = [...behaviors];
      const oldBehaviorName = newBehaviors[editingBehaviorIndex];
      newBehaviors[editingBehaviorIndex] = editingBehaviorName.trim();
      setBehaviors(newBehaviors);
      
      // Update interval behavior if it was the edited one
      if (intervalBehavior === oldBehaviorName) {
        setIntervalBehavior(editingBehaviorName.trim());
      }
      
      // Update existing intervals with the new behavior name
      setIntervals(intervals.map(interval => 
        interval.behavior === oldBehaviorName 
          ? {...interval, behavior: editingBehaviorName.trim()}
          : interval
      ));
    }
    setEditingBehaviorIndex(-1);
    setEditingBehaviorName("");
  };

  const cancelEditingBehavior = () => {
    setEditingBehaviorIndex(-1);
    setEditingBehaviorName("");
  };

  const moveBehaviorUp = (index) => {
    if (index > 0) {
      const newBehaviors = [...behaviors];
      [newBehaviors[index - 1], newBehaviors[index]] = [newBehaviors[index], newBehaviors[index - 1]];
      setBehaviors(newBehaviors);
    }
  };

  const moveBehaviorDown = (index) => {
    if (index < behaviors.length - 1) {
      const newBehaviors = [...behaviors];
      [newBehaviors[index], newBehaviors[index + 1]] = [newBehaviors[index + 1], newBehaviors[index]];
      setBehaviors(newBehaviors);
    }
  };

  const startEditingNumber = (index) => {
    setEditingNumberIndex(index);
    setEditingNumber((index + 1).toString());
  };

  const saveEditingNumber = () => {
    const newPosition = parseInt(editingNumber) - 1; // Convert to 0-based index
    if (isNaN(newPosition) || newPosition < 0 || newPosition >= behaviors.length) {
      // Invalid number, cancel editing
      setEditingNumberIndex(-1);
      setEditingNumber("");
      return;
    }

    if (newPosition !== editingNumberIndex) {
      // Move the behavior to the new position
      const newBehaviors = [...behaviors];
      const behaviorToMove = newBehaviors[editingNumberIndex];
      
      // Remove from current position
      newBehaviors.splice(editingNumberIndex, 1);
      
      // Insert at new position
      newBehaviors.splice(newPosition, 0, behaviorToMove);
      
      setBehaviors(newBehaviors);
      
      // Update interval behavior references if needed
      setIntervals(intervals.map(interval => ({
        ...interval,
        behavior: interval.behavior
      })));
    }
    
    setEditingNumberIndex(-1);
    setEditingNumber("");
  };

  const cancelEditingNumber = () => {
    setEditingNumberIndex(-1);
    setEditingNumber("");
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
        
        // Keep frame rate at default 30 FPS (user can manually adjust if needed)
        console.log("Video loaded. Frame rate remains at default 30 FPS (editable by user).");
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
        videoRef.current.onseeked = null;
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
      } else if (["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9"].includes(e.code)) {
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
      // Don't prevent default if it's a browser zoom command (Cmd/Ctrl + +)
      if (!e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        zoomIn();
      }
    } else if (e.code === "Minus" || e.code === "NumpadSubtract") { // - key for zoom out
      // Don't prevent default if it's a browser zoom command (Cmd/Ctrl + -)
      if (!e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        zoomOut();
      }
    } else if (e.code === "Digit0" || e.code === "Numpad0") { // 0 key for reset zoom
      // Don't prevent default if it's a browser zoom command (Cmd/Ctrl + 0)
      if (!e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        resetZoom();
      }
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
        const maxFrame = Math.round(videoDuration * frameRate) - 1;
        const newFrame = Math.max(0, Math.min(currentFrameRef.current + direction, maxFrame));
        const newTime = newFrame / frameRate;
        setCurrentTime(newTime);
        setCurrentFrame(newFrame);
        currentFrameRef.current = newFrame;
        videoRef.current.currentTime = newTime;
        console.log(`Moved to frame: ${newFrame}, time: ${newTime.toFixed(2)}s`);
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
    const maxFrame = Math.round(videoDuration * frameRate) - 1;
    const newFrame = Math.max(0, Math.min(Math.round(time * frameRate), maxFrame));
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
    const maxFrame = Math.round(videoDuration * frameRate) - 1; // 0-based indexing
    const newFrame = Math.min(currentFrame + 1, maxFrame);
    const newTime = newFrame / frameRate;
    setCurrentTime(newTime);
    setCurrentFrame(newFrame);
    currentFrameRef.current = newFrame;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      console.log(`Next frame: ${newFrame}, time: ${newTime.toFixed(2)}s`);
    }
  }

  function movePrevFrame() {
    const newFrame = Math.max(currentFrame - 1, 0);
    const newTime = newFrame / frameRate;
    setCurrentTime(newTime);
    setCurrentFrame(newFrame);
    currentFrameRef.current = newFrame;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      console.log(`Previous frame: ${newFrame}, time: ${newTime.toFixed(2)}s`);
    }
  }

  // Function to jump to a specific frame when interval is clicked
  function jumpToFrame(frameNumber) {
    const maxFrame = Math.round(videoDuration * frameRate) - 1;
    const targetFrame = Math.max(0, Math.min(frameNumber, maxFrame));
    const newTime = targetFrame / frameRate;
    setCurrentTime(newTime);
    setCurrentFrame(targetFrame);
    currentFrameRef.current = targetFrame;
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      console.log(`Jumped to frame: ${targetFrame}, time: ${newTime.toFixed(2)}s`);
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
    if (startFrame < 0 || endFrame >= maxFrame) {
      alert(`Frames must be between 1 and ${maxFrame}.`);
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
    const currentRowsPerPage = getRowsPerPage(behaviorSettingsExpanded);
    if (page * currentRowsPerPage >= intervals.length - 1) {
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
          <Typography variant="h4" gutterBottom fontWeight="bold">Behavior Annotator</Typography>
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
                  minWidth: "700px",
                  maxWidth: "700px",
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
                    minWidth: "700px",
                    maxWidth: "700px",
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
                    prev frame
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={moveNextFrame}
                    aria-label="Next frame"
                  >
                    next frame
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={markIntervalStart}
                    aria-label="Mark start frame"
                  >
                    mark start (S)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={markIntervalEnd}
                    aria-label="Mark end frame"
                  >
                    mark end (E)
                  </Button>
                  <Box>
                  <Typography>
                    Current Frame: {currentFrame + 1} / {Math.round(videoDuration * frameRate)}
                  </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Time: {currentTime.toFixed(5)}s
                    </Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2, mt: 1, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    onClick={zoomIn}
                    aria-label="Zoom in"
                  >
                    zoom in (+)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={zoomOut}
                    aria-label="Zoom out"
                  >
                    zoom out (-)
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={resetZoom}
                    aria-label="Reset zoom"
                  >
                    reset zoom
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
                  max={Math.round(videoDuration * frameRate) - 1}
                  step={1}
                  onChange={handleSliderChange}
                  aria-label="Video frame timeline"
                  sx={{ mt: 2 }}
                />
                
                {/* Behavior Indicator Bar */}
                {videoDuration > 0 && (
                  <Box sx={{ mt: 1, mb: 1 }}>
                    <Typography variant="caption" sx={{ mb: 0.5, display: 'block', color: 'text.secondary' }}>
                      Behavior Timeline
                    </Typography>
                    <Box sx={{ 
                      position: 'relative', 
                      height: '20px', 
                      bgcolor: 'background.paper',
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: '10px',
                      overflow: 'hidden'
                    }}>
                      {/* Background timeline */}
                      <Box sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        bottom: 0,
                        bgcolor: themeMode === 'dark' ? '#404040' : '#f0f0f0'
                      }} />
                      
                      {/* Behavior segments */}
                      {intervals.map((interval, index) => {
                        const totalFrames = Math.round(videoDuration * frameRate);
                        const startPercent = (interval.start / totalFrames) * 100;
                        const widthPercent = ((interval.end - interval.start) / totalFrames) * 100;
                        const behaviorIndex = behaviors.indexOf(interval.behavior);
                        const color = getBehaviorColor(behaviorIndex);
                        
                        return (
                          <Box
                            key={index}
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: `${startPercent}%`,
                              width: `${widthPercent}%`,
                              height: '100%',
                              bgcolor: color,
                              opacity: 0.8,
                              '&:hover': {
                                opacity: 1,
                                cursor: 'pointer'
                              }
                            }}
                            title={`${interval.behavior}: Frame ${interval.start + 1} - ${interval.end + 1}`}
                            onClick={() => {
                              // Jump to start of interval when clicked
                              const newTime = interval.start / frameRate;
                              setCurrentTime(newTime);
                              setCurrentFrame(interval.start);
                              currentFrameRef.current = interval.start;
                              if (videoRef.current) {
                                videoRef.current.currentTime = newTime;
                              }
                            }}
                          />
                        );
                      })}
                      
                      {/* Current position indicator */}
                      <Box sx={{
                        position: 'absolute',
                        top: 0,
                        left: `${(currentFrame / Math.max(Math.round(videoDuration * frameRate) - 1, 1)) * 100}%`,
                        width: '3px',
                        height: '100%',
                        bgcolor: themeMode === 'dark' ? '#ffffff' : '#000000',
                        zIndex: 10,
                        transform: 'translateX(-1.5px)'
                      }} />
                    </Box>
                    
                    {/* Behavior legend */}
                    <Box sx={{ 
                      display: 'flex', 
                      flexWrap: 'wrap', 
                      gap: 1, 
                      mt: 1,
                      justifyContent: 'center'
                    }}>
                      {behaviors.map((behavior, index) => (
                        <Box key={behavior} sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 0.5 
                        }}>
                          <Box sx={{
                            width: 12,
                            height: 12,
                            bgcolor: getBehaviorColor(index),
                            borderRadius: '2px',
                            border: 1,
                            borderColor: 'divider'
                          }} />
                          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
                            {behavior.charAt(0).toUpperCase() + behavior.slice(1)}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                )}

                
              </>
            )}

                        {/* Behavior Settings Accordion */}
            <Box sx={{ 
              width: "100%",
              minWidth: "700px",
              maxWidth: "700px",
              margin: '16px auto 0 auto'
            }}>
              <Accordion 
                expanded={behaviorSettingsExpanded} 
                onChange={() => setBehaviorSettingsExpanded(!behaviorSettingsExpanded)}
                sx={{ 
                  mt: 0, 
                  bgcolor: 'background.paper',
                  width: '100%'
                }}
              >
                <AccordionSummary 
                  expandIcon={<ExpandMoreIcon />}
                  aria-controls="behavior-settings-content"
                  id="behavior-settings-header"
                >
                  <Typography variant="h6">Behavior Settings</Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ width: '100%', padding: '16px' }}>
                  <Box sx={{ 
                    width: '100%',
                    display: 'flex',
                    gap: 2
                  }}>
                                        {/* Behavior Reference Table */}
                    <Box sx={{ flex: 0.8 }}>
                      <Paper sx={{ 
                        p: 2, 
                        bgcolor: 'background.default', 
                        height: 350, 
                        display: 'flex', 
                        flexDirection: 'column',
                        width: '100%'
                      }}>
                        <Typography variant="h6" gutterBottom>Behaviors Reference</Typography>
                        <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                          <Table size="small" sx={{ 
                            '& .MuiTableCell-root': { 
                              padding: '4px 8px',
                              fontSize: '0.8rem'
                            }
                          }}>
                            <TableHead>
                              <TableRow>
                                <TableCell><strong>Key</strong></TableCell>
                                <TableCell><strong>Behavior</strong></TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {behaviors.map((behavior, index) => (
                                <TableRow key={index}>
                                  <TableCell>{index + 1}</TableCell>
                                  <TableCell>{behavior.charAt(0).toUpperCase() + behavior.slice(1)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </Box>
                      </Paper>
                    </Box>

                    {/* Behavior Management */}
                    <Box sx={{ flex: 1.2 }}>
                      <Paper sx={{ 
                        p: 2, 
                        bgcolor: 'background.default', 
                        height: 350, 
                        display: 'flex', 
                        flexDirection: 'column',
                        width: '100%'
                      }}>
                      <Typography variant="h6" gutterBottom>Manage Behaviors</Typography>
                      
                      {/* Add new behavior */}
                      <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                        <TextField
                          size="small"
                          label="New behavior"
                          value={newBehaviorName}
                          onChange={(e) => setNewBehaviorName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addBehavior()}
                          sx={{ flexGrow: 1 }}
                        />
                        <Button 
                          size="small" 
                          onClick={addBehavior}
                          disabled={!newBehaviorName.trim() || behaviors.includes(newBehaviorName.trim())}
                        >
                          Add
                        </Button>
                      </Box>

                      {/* Behavior list with edit/delete/reorder */}
                      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
                        {behaviors.map((behavior, index) => (
                          <Box key={index} sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 0.5, 
                            mb: 1,
                            p: 1,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1
                          }}>
                            {editingNumberIndex === index ? (
                              <TextField
                                size="small"
                                value={editingNumber}
                                onChange={(e) => setEditingNumber(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') saveEditingNumber();
                                  if (e.key === 'Escape') cancelEditingNumber();
                                }}
                                onBlur={saveEditingNumber}
                                sx={{ 
                                  minWidth: 35, 
                                  maxWidth: 35,
                                  '& .MuiInputBase-input': { 
                                    fontSize: '0.8rem', 
                                    textAlign: 'center',
                                    padding: '2px 4px'
                                  } 
                                }}
                                autoFocus
                              />
                            ) : (
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  minWidth: 18, 
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  '&:hover': {
                                    backgroundColor: 'action.hover',
                                    borderRadius: 1,
                                    padding: '2px 4px',
                                    margin: '-2px -4px'
                                  }
                                }}
                                onClick={() => startEditingNumber(index)}
                                title="Click to edit position"
                              >
                                {index + 1}.
                              </Typography>
                            )}
                            
                            {editingBehaviorIndex === index ? (
                              <>
                                <TextField
                                  size="small"
                                  value={editingBehaviorName}
                                  onChange={(e) => setEditingBehaviorName(e.target.value)}
                                  onKeyPress={(e) => e.key === 'Enter' && saveEditingBehavior()}
                                  sx={{ flexGrow: 1, '& .MuiInputBase-input': { fontSize: '0.8rem' } }}
                                  autoFocus
                                />
                                <Button size="small" onClick={saveEditingBehavior} sx={{ fontSize: '0.75rem', minWidth: 40 }}>Save</Button>
                                <Button size="small" onClick={cancelEditingBehavior} sx={{ fontSize: '0.75rem', minWidth: 45 }}>Cancel</Button>
                              </>
                            ) : (
                              <>
                                <Typography variant="body2" sx={{ flexGrow: 1, fontSize: '0.8rem' }}>
                                  {behavior.charAt(0).toUpperCase() + behavior.slice(1)}
                                </Typography>
                                <Button size="small" onClick={() => startEditingBehavior(index)} sx={{ fontSize: '0.75rem', minWidth: 35 }}>Edit</Button>
                                <Button size="small" onClick={() => moveBehaviorUp(index)} disabled={index === 0} sx={{ fontSize: '0.75rem', minWidth: 28 }}>↑</Button>
                                <Button size="small" onClick={() => moveBehaviorDown(index)} disabled={index === behaviors.length - 1} sx={{ fontSize: '0.75rem', minWidth: 28 }}>↓</Button>
                                <Button 
                                  size="small" 
                                  color="error" 
                                  onClick={() => deleteBehavior(index)}
                                  disabled={behaviors.length === 1}
                                  sx={{ fontSize: '0.75rem', minWidth: 35 }}
                                >
                                  Del
                                </Button>
                              </>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </Paper>
                  </Box>
                </Box>
              </AccordionDetails>
            </Accordion>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ 
              p: 2, 
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 1, 
              bgcolor: 'background.paper', 
              height: !videoUrl 
                ? (behaviorSettingsExpanded ? '952px' : '554px')
                : (behaviorSettingsExpanded ? '1180px' : '782px'),
              display: 'flex',
              flexDirection: 'column',
              transition: 'height 0.3s ease-in-out'
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6">Behavior Intervals</Typography>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => setShowShortcutsModal(true)}
                >
                  Shortcuts
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <TextField
                  label="Start Frame"
                  type="number"
                  value={intervalStartFrame === "" ? "" : intervalStartFrame + 1}
                  onChange={(e) => {
                    const v = e.target.value;
                    console.log("Start Frame input:", v);
                    const zeroBasedFrame = v === "" ? "" : Number(v) - 1;
                    setIntervalStartFrame(zeroBasedFrame);
                    if (v !== "") setMarkStart(zeroBasedFrame);
                    else setMarkStart(null);
                  }}
                  size="small"
                  inputProps={{ min: 1, step: 1 }}
                  aria-label="Interval start frame"
                />
                <TextField
                  label="End Frame"
                  type="number"
                  value={intervalStartFrame !== "" ? (intervalEndFrame === "" ? "" : intervalEndFrame + 1) : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    console.log("End Frame input:", v);
                    const zeroBasedFrame = v === "" ? "" : Number(v) - 1;
                    setIntervalEndFrame(zeroBasedFrame);
                  }}
                  size="small"
                  inputProps={{ min: intervalStartFrame !== "" ? Number(intervalStartFrame) + 1 : 1, step: 1 }}
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
              
              {/* Table Container - flexGrow to take available space */}
              <Box sx={{ 
                flexGrow: 1, 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'auto'
              }}>
                <Table size="small" sx={{ 
                  '& .MuiTableCell-root': { 
                    padding: '4px 8px',
                    fontSize: '0.8rem'
                  },
                  '& .MuiTableRow-root': {
                    height: '36px'
                  },
                  '& .MuiSelect-select': {
                    fontSize: '0.8rem',
                    padding: '4px 6px'
                  },
                  '& .MuiButton-root': {
                    fontSize: '0.75rem',
                    padding: '4px 10px',
                    minHeight: '28px'
                  }
                }}>
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
                        .slice(page * getRowsPerPage(behaviorSettingsExpanded), (page + 1) * getRowsPerPage(behaviorSettingsExpanded))
                        .map((interval, i) => (
                          <TableRow key={i}>
                            <TableCell 
                              sx={{ 
                                cursor: 'pointer', 
                                color: 'primary.main',
                                '&:hover': {
                                  backgroundColor: 'action.hover',
                                  textDecoration: 'underline'
                                }
                              }}
                              onClick={() => jumpToFrame(interval.start)}
                              title={`Click to jump to frame ${interval.start + 1}`}
                            >
                              {`${interval.start + 1} - ${interval.end + 1}`}
                            </TableCell>
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
              </Box>
              
              {/* Pagination embedded at bottom of window */}
              {intervals.length > getRowsPerPage(behaviorSettingsExpanded) && (
                <Box sx={{ 
                  mt: 'auto',
                  pt: 2,
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: 1,
                  borderColor: 'divider'
                }}>
                  <Button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    variant="outlined"
                    aria-label="Previous page"
                  >
                    Previous
                  </Button>
                  <Typography sx={{ mx: 'auto' }}>
                    Page {page + 1} / {Math.ceil(intervals.length / getRowsPerPage(behaviorSettingsExpanded))}
                  </Typography>
                  <Button
                    onClick={() => setPage(p => p + 1)}
                    disabled={(page + 1) * getRowsPerPage(behaviorSettingsExpanded) >= intervals.length}
                    variant="outlined"
                    aria-label="Next page"
                  >
                    Next
                  </Button>
                </Box>
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Shortcuts Modal */}
      <Modal
        open={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        aria-labelledby="shortcuts-modal-title"
        aria-describedby="shortcuts-modal-description"
      >
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          bgcolor: 'background.paper',
          border: '2px solid',
          borderColor: 'divider',
          borderRadius: 2,
          boxShadow: 24,
          p: 4,
        }}>
          <Typography id="shortcuts-modal-title" variant="h6" component="h2" gutterBottom>
            Keyboard Shortcuts
          </Typography>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body1" sx={{ mb: 1 }}><strong>Navigation:</strong></Typography>
            <Typography variant="body2" sx={{ ml: 2, mb: 0.5 }}>• Arrow Right/Left: Navigate frames and mark end</Typography>
            <Typography variant="body2" sx={{ ml: 2, mb: 1 }}>• S: Mark start frame</Typography>
            <Typography variant="body2" sx={{ ml: 2, mb: 1 }}>• E: Update end frame</Typography>
            
            <Typography variant="body1" sx={{ mb: 1, mt: 2 }}><strong>Behaviors:</strong></Typography>
            {behaviors.map((behavior, index) => (
              <Typography key={behavior} variant="body2" sx={{ ml: 2, mb: 0.5 }}>
                • {index + 1}: {behavior.charAt(0).toUpperCase() + behavior.slice(1)}
              </Typography>
            ))}
            <Typography variant="body2" sx={{ ml: 2, mb: 1, fontStyle: 'italic', color: 'text.secondary' }}>
              Note: Keys 1-{behaviors.length} select behaviors (easier keyboard access)
            </Typography>
            
            <Typography variant="body1" sx={{ mb: 1, mt: 2 }}><strong>Zoom:</strong></Typography>
            <Typography variant="body2" sx={{ ml: 2, mb: 0.5 }}>• +: Zoom in</Typography>
            <Typography variant="body2" sx={{ ml: 2, mb: 0.5 }}>• -: Zoom out</Typography>
            <Typography variant="body2" sx={{ ml: 2, mb: 1 }}>• 0: Reset zoom</Typography>
            

          </Box>
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={() => setShowShortcutsModal(false)} variant="contained">
              Close
            </Button>
          </Box>
        </Box>
      </Modal>
    </ThemeProvider>
  );
}

export default App;