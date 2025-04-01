import React, { useMemo } from "react";
import { Box, Typography, Grid, Card, CardContent, Button } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { OWNER_COLORS } from "./config";

const AdminDashboard = ({ entries, loggedInUser, setOpenCreateDialog, setOpenManualDialog }) => {
  // Statistiken berechnen
  const stats = useMemo(() => {
    const owners = [...new Set(entries.map((e) => e.owner))];
    const result = {
      totalEntries: entries.length,
      activeEntries: entries.filter((e) => e.status === "Aktiv").length,
      paidEntries: entries.filter((e) => e.paymentStatus === "Gezahlt").length,
      totalFees: entries.reduce((sum, e) => sum + (e.admin_fee || 0), 0),
      byOwner: owners.map((owner) => ({
        owner,
        count: entries.filter((e) => e.owner === owner).length,
        fees: entries.filter((e) => e.owner === owner).reduce((sum, e) => sum + (e.admin_fee || 0), 0),
      })),
    };
    return result;
  }, [entries]);

  return (
    <Box sx={{ p: 2, borderBottom: "1px solid #e0e0e0" }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 1 }}>
        Admin-Dashboard
      </Typography>
      <Grid container spacing={1} alignItems="center">
        {/* Statistik-Kacheln */}
        <Grid item xs={6} sm={3} md={2}>
          <Card sx={{ borderRadius: 1, boxShadow: 1, p: 1 }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Gesamt
              </Typography>
              <Typography variant="h6" color="primary">
                {stats.totalEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Card sx={{ borderRadius: 1, boxShadow: 1, p: 1 }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Aktiv
              </Typography>
              <Typography variant="h6" color="success.main">
                {stats.activeEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Card sx={{ borderRadius: 1, boxShadow: 1, p: 1 }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Gezahlt
              </Typography>
              <Typography variant="h6" color="success.main">
                {stats.paidEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={6} sm={3} md={2}>
          <Card sx={{ borderRadius: 1, boxShadow: 1, p: 1 }}>
            <CardContent sx={{ p: 1 }}>
              <Typography variant="body2" color="textSecondary">
                Gebühren
              </Typography>
              <Typography variant="h6" color="primary">
                {stats.totalFees}$ €
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        {/* Buttons */}
        <Grid item xs={12} sm={6} md={4}>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setOpenCreateDialog(true)}
              sx={{ borderRadius: 1, flexGrow: 1 }}
            >
              Neu
            </Button>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<EditIcon />}
              onClick={() => setOpenManualDialog(true)}
              sx={{ borderRadius: 1, flexGrow: 1 }}
            >
              Bestehend
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AdminDashboard;
