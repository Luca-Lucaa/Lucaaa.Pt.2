import React, { useState } from "react";
import {
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney"; // Icon für den Betrag
import { formatDate } from "./utils"; // Import der formatDate-Funktion

const EntryAccordion = ({ entry, role, loggedInUser, setEntries }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography>{entry.aliasNotes || entry.username}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Typography><strong>Benutzername:</strong> {entry.username}</Typography>
        <Typography><strong>Passwort:</strong> {entry.password}</Typography>
        <Typography><strong>Typ:</strong> {entry.type}</Typography>
        <Typography><strong>Status:</strong> {entry.status}</Typography>
        <Typography><strong>Zahlungsstatus:</strong> {entry.paymentStatus}</Typography>
        <Typography><strong>Gültig bis:</strong> {formatDate(entry.validUntil)}</Typography>
        <Typography>
          <strong>Admin-Gebühr:</strong>{" "}
          {entry.admin_fee ? (
            <>
              <AttachMoneyIcon sx={{ fontSize: "1rem", verticalAlign: "middle", marginRight: 0.5 }} />
              {entry.admin_fee.toLocaleString()}
            </>
          ) : (
            "Keine"
          )}
        </Typography>
        <Typography><strong>Bouget-Liste:</strong> {entry.bougetList || "Keine"}</Typography>
        <Typography><strong>Ersteller:</strong> {entry.owner}</Typography>
        <Typography><strong>Erstellt am:</strong> {formatDate(entry.createdAt)}</Typography>
      </AccordionDetails>
    </Accordion>
  );
};

export default EntryAccordion;
