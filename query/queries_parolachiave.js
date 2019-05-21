class ParolaChiave {

    constructor(idParolaChiave, termine){
        this.idParolaChiave = idParolaChiave;
        this.termine = termine;
    }

    save() {
        let sql=`INSERT INTO ParolaChiave(Termine) VALUES('${this.termine}')`;
        return sql;           
    }

    getParolaChiaveByTermine() {
        let sql =`SELECT * FROM ParolaChiave WHERE Termine='${this.termine}'`;
        return sql;
    }

    saveNew() {
        let sql =`INSERT INTO ParolaChiave(Termine)
        SELECT * FROM (SELECT '${this.termine}') AS tmp
        WHERE NOT EXISTS (
            SELECT Termine FROM ParolaChiave WHERE Termine = '${this.termine}'
        ) LIMIT 1`;
        return sql;
    }
}

module.exports = ParolaChiave;