// Built-in Node.js modules
const fs = require('fs');
const path = require('path');
// NPM modules
let express = require('express');
let sqlite3 = require('sqlite3');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));



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

// TODO: change this to a GET:// with a URL encoded parameter, maybe
app.post('/lookup', async (req, res) => {
    const address = req.body.address;
    if (!address) {
        res.status(400).type('json').send({error: 'Validation Error: address is required'});
    }

    console.log('Looking up the address for ',address)
    const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${address}&format=json`, {
        method: 'GET',
        headers: {
            ['content-type']: 'application/json'
        }
    });
    const data = await response.json()
    console.log('Got the response', data)
    res.status(200).type('json').send(data);
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

function extractListFromQueryParam(val) {
    return (Array.isArray(val) ? val : [val])
        .flatMap(el => el.split(','))
}

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    let sql = "SELECT case_number, date(date_time) as date, time(date_time) as time, code, incident, police_grid, Incidents.neighborhood_number, Neighborhoods.neighborhood_name, block FROM Incidents INNER JOIN Neighborhoods ON Incidents.neighborhood_number = Neighborhoods.neighborhood_number ORDER BY date_time DESC LIMIT 1000";
    let p = [];
    if(Object.keys(req.query).length !== 0){
        sql = "SELECT case_number, date(date_time) as date, time(date_time) as time, code, incident, police_grid, Incidents.neighborhood_number, Neighborhoods.neighborhood_name, block FROM Incidents INNER JOIN Neighborhoods ON Incidents.neighborhood_number = Neighborhoods.neighborhood_number";
        let k;
        let i = 0;
        let j = 0;
        let and = ' AND';
        let where = ' WHERE';
        for(k in req.query) {
            if(k == 'code'){
                if(i==0){
                    sql += where;
                }
                else{
                    sql += and;
                }
                sql = sql + " code IN (?)";
                // TODO: we might want to be returning `...flatMap().join(,)` from extractListFromQueryParam
                // if this errors out that's probably why
                p.push(extractListFromQueryParam(req.query.code));
                i++;
            }
            else if(k == 'start_date'){
                if(i==0){
                    sql += where;
                }
                else{
                    sql += and;
                }
                sql = sql + " date > ?";
                p.push(req.query.start_date);
                i++;
            }
            else if(k == 'end_date'){
                if(i==0){
                    sql += where;
                }
                else{
                    sql += and;
                }
                sql = sql + " date < ?";
                p.push(req.query.end_date);
                i++;
            }
            else if(k == 'grid'){
                if(i==0){
                    sql += where;
                }
                else{
                    sql += and;
                }
                sql = sql + " police_grid IN (?)";
                p.push(extractListFromQueryParam(req.query.grid));
                i++;
            }
            else if(k == 'neighborhood'){
                if(i==0){
                    sql += where;
                }
                else{
                    sql += and;
                }
                sql = sql + " neighborhood_number IN (?)";
                p.push(extractListFromQueryParam(req.query.neighborhood_number));
                i++;
            }
            else if(k == 'limit') {
                sql = sql + " ORDER BY date DESC LIMIT (?)";
                p.push(req.query.limit);
                i++;
                j = j + 1;
            }

            if(j == 0){
                sql = sql + " ORDER BY date DESC LIMIT 1000";
            }
        }
    }
        
    db.all(sql, p, (err, rows) => {
        var mydata = []; //once this was inside the db method, the assignment became synchcronous
        if (err) {
            rs.status(500).type('json').send({ error: 'INTERNAL SERVER ERROR'})
        }
        rows.forEach((row) => {
            console.log(row.date);
            mydata.push(row);
        });
        //this returns the response inside the db method
        //so that the data is synchronized
        res.status(200).type('json').send(mydata); 
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
app.delete('/remove-incident', (req, res) => {
    console.log(req.body); // uploaded data
    databaseSelect("SELECT * from Incidents WHERE case_number = (?)", (err, res)=>{
        if (err) {
            //TODO:  handle error
        } else {
            if (res) {
                let sql = "DELETE FROM Incidents WHERE case_number = (?)";
                databaseRun(sql, req.body.case_number).then(() => {
                    res.status(200).type('txt').send('OK');
                })
                .catch((err) => {
                    res.status(500).type('txt').send('NOT OK')
                })
            } else {
                // prof complaint
                //TODO: handle 204 NO CONTENT
            }
        }
    });
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