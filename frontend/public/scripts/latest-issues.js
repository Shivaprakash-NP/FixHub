// latest-issues.js

// Fetch all reports from the backend endpoint
fetch('/reports')
  .then(response => response.json())
  .then(data => {
    // Sort the reports by voteCount descending and take the top three
    const topReports = data.reports
      .sort((a, b) => b.voteCount - a.voteCount)
      .slice(0, 3);
    
    // Get the container element
    const container = document.getElementById('issuesContainer');
    if (!container) return;
    
    // Clear any existing content (if needed)
    container.innerHTML = '';
    
    // For each report, create a card and add it to the container
    topReports.forEach(report => {
      const card = document.createElement('div');
      card.classList.add('issue-card');
      card.innerHTML = `
        <h4>${report.title}</h4>
        <p>${report.description}</p>
        <p><strong>Votes:</strong> ${report.voteCount || 0}</p>
      `;
      container.appendChild(card);
    });
  })
  .catch(error => console.error('Error fetching reports:', error));
