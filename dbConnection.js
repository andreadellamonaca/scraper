const mysql = require("mysql");
                
var con = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: 'bibliog'
});

function openConnection() {
    con.connect(function(err) {
        if (err) throw err;
        console.log("Connected!");
      });
}

function executeQuery(sql, callback) {
    if(con.state === 'authenticated'){
        con.query(sql, function (err, result) {
          if (err) {
            return callback(err, null);
          } else {
            return callback(null, result);
          }
          //console.log(result);
        });
    }
    else {
      con.resume();
      con.query(sql, function (err, result) {
        if (err) {
          return callback(err, null);
        } else {
          return callback(null, result);
        }
        //console.log(result);
      });
    }
}

function query(sql, callback) {    
  executeQuery(sql,function(err, data) {
      if(err) {
        //console.log(err);
        return callback(err);
      }
      callback(null, data);
  });
}

function closeConnection() {
    con.end(function(err) {
        if (err) {
          return console.log('error:' + err.message);
        }
        console.log('Close the database connection.');
      });
}

module.exports = {
    query: query,
    close: closeConnection,
    open: openConnection
}