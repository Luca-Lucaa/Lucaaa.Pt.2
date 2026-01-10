import React from "react";
import { 
  Box, 
  Typography, 
  IconButton, 
  Menu, 
  MenuItem, 
  Badge, 
  Tooltip 
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

const ChatMessage = ({ 
  message, 
  sender, 
  timestamp, 
  isOwnMessage, 
  reactions, 
  onReact, 
  onMenuOpen, 
  parentMessage, 
  isRead 
}) => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const formattedTimestamp = new Date(timestamp).toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
    onMenuOpen(event);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const safeReactions = reactions || {};

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: isOwnMessage ? "flex-end" : "flex-start",
        maxWidth: "85%",
        mb: 1.5,
      }}
    >
      {parentMessage && (
        <Box
          sx={{
            backgroundColor: "grey.100",
            p: 1.5,
            borderRadius: 2,
            mb: 1,
            maxWidth: "90%",
            borderLeft: "4px solid",
            borderColor: "grey.400",
            fontSize: "0.85rem",
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Antwort auf: <strong>{parentMessage.sender}</strong>
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {parentMessage.message}
          </Typography>
        </Box>
      )}

      <Box
        sx={{
          p: 2,
          borderRadius: 3,
          backgroundColor: isOwnMessage ? "primary.light" : "grey.200",
          color: isOwnMessage ? "primary.contrastText" : "text.primary",
          boxShadow: 1,
          position: "relative",
          maxWidth: "100%",
          wordBreak: "break-word",
        }}
      >
        <Typography variant="body1">{message}</Typography>

        <Box 
          sx={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            mt: 1.5,
            fontSize: "0.75rem",
            opacity: 0.7
          }}
        >
          <Typography variant="caption">
            {sender} • {formattedTimestamp}
          </Typography>

          {isOwnMessage && (
            <Tooltip title={isRead ? "Gelesen" : "Gesendet"}>
              <CheckCircleIcon 
                fontSize="small" 
                color={isRead ? "success" : "action"} 
                sx={{ ml: 1 }}
              />
            </Tooltip>
          )}
        </Box>

        {Object.keys(safeReactions).length > 0 && (
          <Box 
            sx={{ 
              display: "flex", 
              justifyContent: "flex-end", 
              gap: 1, 
              mt: 1.5,
              flexWrap: "wrap"
            }}
          >
            {Object.entries(safeReactions).map(([emoji, count]) => (
              <Badge 
                key={emoji} 
                badgeContent={count} 
                color="secondary"
                sx={{ 
                  "& .MuiBadge-badge": { 
                    fontSize: '0.7rem', 
                    minWidth: 18, 
                    height: 18 
                  }
                }}
              >
                <span role="img" aria-label={emoji} style={{ fontSize: '1.3rem' }}>
                  {emoji}
                </span>
              </Badge>
            ))}
          </Box>
        )}

        <IconButton
          size="small"
          onClick={handleMenuOpen}
          sx={{ 
            position: "absolute", 
            top: 4, 
            right: 4,
            opacity: 0.6,
            '&:hover': { opacity: 1 }
          }}
        >
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <MenuItem onClick={() => { onReact("👍"); handleMenuClose(); }}>👍 Like</MenuItem>
        <MenuItem onClick={() => { onReact("❤️"); handleMenuClose(); }}>❤️ Herz</MenuItem>
        <MenuItem onClick={() => { onReact("😂"); handleMenuClose(); }}>😂 Lachen</MenuItem>
        <MenuItem onClick={() => { onReact("😮"); handleMenuClose(); }}>😮 Überrascht</MenuItem>
      </Menu>
    </Box>
  );
};

export default ChatMessage;
