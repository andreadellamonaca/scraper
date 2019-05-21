class Giornale {

    constructor(idGiornale, titolo){
        this.idGiornale = idGiornale;
        this.titolo = titolo;
    }

    save() {
        let sql=`INSERT INTO Giornale(Titolo) VALUES('${this.titolo}')`;
        return sql;           
    }

    getGiornaleByTitolo() {
        let sql =`SELECT * FROM Giornale WHERE Titolo='${this.titolo}'`;
        return sql;
    }

    saveNew() {
        let sql =`INSERT INTO Giornale(Titolo)
        SELECT * FROM (SELECT '${this.titolo}') AS tmp
        WHERE NOT EXISTS (
            SELECT Titolo FROM Giornale WHERE Titolo = '${this.titolo}'
        ) LIMIT 1`;
        return sql;
    }
}

module.exports = Giornale;