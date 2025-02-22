import React from "react";
import { Box, Typography } from "@mui/material";

const ChatMessage = ({ message, sender, timestamp, isOwnMessage }) => {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: isOwnMessage ? "flex-end" : "flex-start",
        marginBottom: 2,
      }}
    >
      <Box
        sx={{
          maxWidth: "70%",
          padding: 1.5,
          borderRadius: 2,
          backgroundColor: isOwnMessage ? "primary.main" : "grey.200",
          color: isOwnMessage ? "primary.contrastText" : "text.primary",
          boxShadow: 1,
        }}
      >
        <Typography variant="body1">{message}</Typography>
        <Typography variant="caption" sx={{ display: "block", textAlign: "right" }}>
          {sender} - {new Date(timestamp).toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default ChatMessage;
