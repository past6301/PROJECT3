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
let port = 8000;

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
        p.push(req.query.code);
    }
    console.log(query);
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
    if(Object.keys(req.query).length !== 0){
        sql = "SELECT * FROM Neighborhoods WHERE neighborhood_number IN (?) ORDER BY neighborhood_number";
    }
    sql = sql.replace("?", req.query.neighborhood_number);
    db.all(sql, [], (err, rows) => {
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
    let sql = "SELECT case_number, date(date_time) as date, time(date_time) as time, code, incident, police_grid, neighborhood_number, block FROM Incidents ORDER BY date_time LIMIT 1000";
    let p = [];
    if(Object.keys(req.query).length !== 0){
        sql = "SELECT case_number, date(date_time) as date, time(date_time) as time, code, incident, police_grid, neighborhood_number, block FROM Incidents";
        let k;
        for(k in req.query){
            if(k == 'code'){
                sql = sql + " WHERE code IN (?)";
                p.push(req.query.code);
            }
            else if(k == 'start_date'){
                sql = sql + " WHERE date > ?";
                p.push(req.query.start_date);
            }
            else if(k == 'end_date'){
                sql = sql + " WHERE date < ?";
                p.push(req.query.end_date);
            }
            else if(k == 'grid'){
                sql = sql + " WHERE police_grid IN (?)";
                p.push(req.query.grid);
            }
            else if(k == 'neighborhood'){
                n = true;
            }
            else if(k == 'limit'){
                l = true;
            }
        }
        sql = sql + " LIMIT 100";
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
  
    // insert one row into the langs table
    //db.run(`INSERT INTO langs(name) VALUES(?)`, ['C'], function(err) {
    //https://www.sqlitetutorial.net/sqlite-nodejs/insert/
    //let sql = "IF NOT EXISTS (SELECT * FROM INCIDENTS WHERE case_number = '')\
    //BEGIN\
    //    INSERT INTO Incidents(case_number TEXT, date_time DATETIME, code INTEGER, incident TEXT, police_grid INTEGER, neighborhood_number INTEGER, block TEXT) \
    //    VALUES (?);\
    //END";

    let sql = "INSERT INTO Incidents(case_number TEXT, date_time DATETIME, code INTEGER, incident TEXT, police_grid INTEGER, neighborhood_number INTEGER, block TEXT) \
    VALUES (?)";
    databaseRun(sql, req.body);
    res.status(200).type('txt').send('OK'); // <-- you may need to change this
});

// DELETE request handler for new crime incident
app.delete('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data
    /*
    sqlDB.run("DELETE FROM Table23 WHERE id=(?)", id_1, function(err)
    https://stackoverflow.com/questions/35008591/sqlite-select-and-delete
    */
    let sql = "DELETE FROM Incidents WHERE case_number = (?)";
    db.run(sql, (err) =>{
        return console.log(err.message);
    });

    res.status(200).type('txt').send('OK'); // <-- you may need to change this
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