const path = require('path');
// ... (keep existing imports)

// ... (keep existing database and API setup)

// Serve the HTML file at the root path
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve static files (including your index.html)
app.use(express.static(path.join(__dirname, 'public')));

// ... (keep the rest of your routes)

// Start the server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});