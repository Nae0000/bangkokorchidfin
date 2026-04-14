const https = require('https');

https.get('https://docs.google.com/spreadsheets/d/1S6Rv6jRLQjlZBlAWYHswZJ8Qiva8mKW5W2Sio-sOorU/export?format=csv&gid=0', (resp) => {
  let data = '';
  resp.on('data', (chunk) => { data += chunk; });
  resp.on('end', () => {
    const lines = data.split('\n');
    const firstCol = lines.slice(0, 70).map(line => line.split(',')[0].trim());
    console.log(firstCol.join('\n'));
  });
}).on("error", (err) => {
  console.log("Error: " + err.message);
});
