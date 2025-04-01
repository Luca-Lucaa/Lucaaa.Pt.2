import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
} from "@mui/material";
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
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Admin-Dashboard
      </Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6">Gesamteinträge</Typography>
              <Typography variant="h4" color="primary">
                {stats.totalEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6">Aktive Einträge</Typography>
              <Typography variant="h4" color="success.main">
                {stats.activeEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6">Gezahlte Einträge</Typography>
              <Typography variant="h4" color="success.main">
                {stats.paidEntries}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: 2, boxShadow: 3 }}>
            <CardContent>
              <Typography variant="h6">Gesamtgebühren</Typography>
              <Typography variant="h4" color="primary">
                {stats.totalFees}$ €
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Einträge nach Ersteller
        </Typography>
        <Grid container spacing={2}>
          {stats.byOwner.map(({ owner, count, fees }) => (
            <Grid item xs={12} sm={6} md={4} key={owner}>
              <Card
                sx={{
                  borderRadius: 2,
                  boxShadow: 3,
                  backgroundColor: OWNER_COLORS[owner] || "#fff",
                }}
              >
                <CardContent>
                  <Typography variant="h6">{owner}</Typography>
                  <Typography variant="body1">Einträge: {count}</Typography>
                  <Typography variant="body1">Gebühren: {fees}$ €</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, gap: 2 }}>
        <Button
          variant="contained"
          color="success"
          startIcon={<AddIcon />}
          onClick={() => setOpenCreateDialog(true)}
          fullWidth
          sx={{ borderRadius: 2 }}
        >
          Abonnent anlegen
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<EditIcon />}
          onClick={() => setOpenManualDialog(true)}
          fullWidth
          sx={{ borderRadius: 2 }}
        >
          Bestehenden Abonnenten einpflegen
        </Button>
      </Box>
    </Box>
  );
};

export default AdminDashboard;
