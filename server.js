// Built-in Node.js modules
let fs = require('fs');
let path = require('path');

// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');


let db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

let app = express();
let cors = require('cors');
app.use(cors());
let port = 8080;

app.use(express.json());

// Open SQLite3 database (in read-only mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});


// GET request handler for crime codes
app.get('/codes', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    console.log(Object.keys(req.query).length);
    let query = "SELECT * FROM Codes ORDER BY code";
    let p = [];
    if(Object.keys(req.query).length !== 0){
        query = "SELECT * FROM Codes WHERE code IN (?) ORDER BY code";
        p[0] = req.query.code;
    }
    console.log(query);
    console.log();
    db.all(query, p, (err, rows) => {
        var mydata = []; //once this was inside the db method, the assignment became synchcronous
        if (err) {
            throw err;
        }
        rows.forEach((row) => {
            console.log(row.code);
            mydata.push(row);
        });
        res.status(200).type('json').send(mydata); 
            //this returns the response inside the db method
            //so that the data is synchronized
    });
});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    let sql = "SELECT * FROM Neighborhoods ORDER BY neighborhood_number";
    let p = [];
    if(Object.keys(req.query).length !== 0){
        sql = "SELECT * FROM Neighborhoods WHERE neighborhood_number IN (?) ORDER BY neighborhood_number";
        p[0] = req.query.neighborhood_number;
    }
    db.all(sql, p, (err, rows) => {
        var mydata = []; //once this was inside the db method, the assignment became synchcronous
        if (err) {
          throw err;
        }
        rows.forEach((row) => {
          console.log(row.neighborhood_number);
          mydata.push(row);
        });
        res.status(200).type('json').send(mydata); 
        //this returns the response inside the db method
        //so that the data is synchronized
      });
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    let sql = "SELECT case_number, date(date_time) as date, time(date_time) as time, code, incident, police_grid, neighborhood_number, block FROM Incidents ORDER BY date_time DESC LIMIT 1000";
    let p = [];
    if(Object.keys(req.query).length !== 0){
        sql = "SELECT case_number, date(date_time) as date, time(date_time) as time, code, incident, police_grid, neighborhood_number, block FROM Incidents";
        let k;
        let i = 0;
        let j = 0;
        let and = ' AND';
        let where = ' WHERE';
        for(k in req.query){
            if(k == 'code'){
                if(i==0){
                    sql = sql + where;
                }
                else{
                    sql = sql + and;
                }
                sql = sql + " code IN (?)";
                p.push(req.query.code);
                i = i + 1;
            }
            else if(k == 'start_date'){
                if(i==0){
                    sql = sql + where;
                }
                else{
                    sql = sql + and;
                }
                sql = sql + " date > ?";
                p.push(req.query.start_date);
                i = i + 1;
            }
            else if(k == 'end_date'){
                if(i==0){
                    sql = sql + where;
                }
                else{
                    sql = sql + and;
                }
                sql = sql + " WHERE date < ?";
                p.push(req.query.end_date);
                i = i + 1;
            }
            else if(k == 'grid'){
                if(i==0){
                    sql = sql + where;
                }
                else{
                    sql = sql + and;
                }
                sql = sql + " WHERE police_grid IN (?)";
                p.push(req.query.grid);
                i = i + 1;
            }
            else if(k == 'neighborhood'){
                if(i==0){
                    sql = sql + where;
                }
                else{
                    sql = sql + and;
                }
                sql = sql + " WHERE police_grid IN (?)";
                p.push(req.query.grid);
                i = i + 1;
            }
            else if(k == 'limit'){
                sql = sql + "ORDER BY date DESC LIMIT (?)"; 
                p.push(req.query.limit); 
                i = i + 1;
                j = j + 1;
            }
        }
        if(j == 0){
            sql = sql + "ORDER BY date DESC LIMIT 1000";
        }
    }
    
    db.all(sql, p, (err, rows) => {
        var mydata = []; //once this was inside the db method, the assignment became synchcronous
        if (err) {
          throw err;
        }
        rows.forEach((row) => {
          console.log(row.date);
          mydata.push(row);
        });
        res.status(200).type('json').send(mydata); 
        //this returns the response inside the db method
        //so that the data is synchronized
      });
});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data
    let params;
    let sql = "INSERT INTO Incidents VALUES (?, ?, ?, ?, ?, ?, ?)";
    let date_time = req.body.date + "T" + req.body.time;
    params = [req.body.case_number, date_time, req.body.code, req.body.incident, req.body.police_grid, req.body.neighborhood_number, req.body.block];
    databaseRun(sql, params)
    .then(() => {
        res.status(200).type('txt').send('OK');
    })
    .catch((err) => {
        res.status(500).type('txt').send('NOT OK')
    })
    // <-- you may need to change this
});

// DELETE request handler for new crime incident
app.delete('/delete-incident', (req, res) => {
    console.log(req.body); // uploaded data
    let sql = "DELETE FROM Incidents WHERE case_number = (?)";
    databaseRun(sql, req.body.case_number)
    .then(() => {
        res.status(200).type('txt').send('OK');
    })
    .catch((err) => {
        res.status(500).type('txt').send('NOT OK')
    })
});


// Create Promise for SQLite3 database SELECT query 
function databaseSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        })
    })
}

// Create Promise for SQLite3 database INSERT or DELETE query
function databaseRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    })
}


// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});