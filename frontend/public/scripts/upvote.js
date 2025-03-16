document.addEventListener("DOMContentLoaded", function() {
  // Fetch all reports from the backend
  fetch('/reports')
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById('issuesContainer');
      container.innerHTML = ''; // Clear container
      
      // Loop through each report from the database
      data.reports.forEach(report => {
        // Create a card element for each report
        const card = document.createElement('div');
        card.classList.add('report-card');
        card.setAttribute('data-report-id', report.id);
        
        // Build the inner HTML of the card
        card.innerHTML = `
          <h3>${report.title}</h3>
          <p><strong>Category:</strong> ${report.category}</p>
          <p>${report.description}</p>
          <p><strong>Location:</strong> ${report.location}</p>
          <p><strong>Votes:</strong> <span class="vote-count">${report.voteCount || 0}</span></p>
          <button class="upvote-btn">Upvote</button>
        `;
        
        container.appendChild(card);
        
        // Check if this report has been upvoted (stored in localStorage)
        const votedReports = JSON.parse(localStorage.getItem("votedReports") || "[]");
        if (votedReports.includes(report.id.toString())) {
          const btn = card.querySelector('.upvote-btn');
          if (btn) btn.style.display = 'none';
        }
      });
      
      // Attach upvote functionality to all upvote buttons
      document.querySelectorAll('.upvote-btn').forEach(button => {
        button.addEventListener('click', function() {
          const card = this.closest('.report-card');
          const reportId = card.getAttribute('data-report-id');
          
          fetch('/upvote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportId })
          })
          .then(response => response.json())
          .then(result => {
            if (result.voteCount !== undefined) {
              // Update the vote count in the UI
              card.querySelector('.vote-count').textContent = result.voteCount;
              // Save the reportId in localStorage so the button remains hidden on reload
              let votedReports = JSON.parse(localStorage.getItem("votedReports") || "[]");
              if (!votedReports.includes(reportId)) {
                votedReports.push(reportId);
                localStorage.setItem("votedReports", JSON.stringify(votedReports));
              }
              // Hide the upvote button
              this.style.display = 'none';
            } else if (result.error) {
              alert(result.error);
            }
          })
          .catch(err => {
            console.error('Upvote error:', err);
            alert('Error upvoting');
          });
        });
      });
    })
    .catch(err => console.error('Error fetching reports:', err));
});
