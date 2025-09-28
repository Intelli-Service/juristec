const jwt = require('jsonwebtoken');
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiVXN1w6FyaW8gQW7DtG5pbW8iLCJlbWFpbCI6ImFub25fMTUxMWJmNjc4OTVhNThkN2ViODE2Y2E0MGNkNjllMTRAYW5vbnltb3VzLmp1cmlzdGVjIiwic3ViIjoiYW5vbl8xNTExYmY2Nzg5NWE1OGQ3ZWI4MTZjYTQwY2Q2OWUxNCIsInJvbGUiOiJjbGllbnQiLCJwZXJtaXNzaW9ucyI6WyJhY2Nlc3Nfb3duX2NoYXQiXSwidXNlcklkIjoiYW5vbl8xNTExYmY2Nzg5NWE1OGQ3ZWI4MTZjYTQwY2Q2OWUxNCIsImlzQW5vbnltb3VzIjp0cnVlLCJpYXQiOjE3NTkwMzAxODJ9.MvXsI0FfeT0UcsCeW7zhDzagplQ7VOh3nO-iUCvxGwY';
const decoded = jwt.decode(token);
console.log('Token válido:', !!decoded);
console.log('Expires at:', new Date(decoded.exp * 1000));
console.log('Current time:', new Date());
console.log('Is expired:', decoded.exp * 1000 < Date.now());
