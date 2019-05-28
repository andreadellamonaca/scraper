class Conferenza {

    constructor(idConferenza, nome, luogo, data){
        this.idConferenza = idConferenza;
        this.nome = nome;
        this.luogo = luogo;
        this.data = data;
    }

    save() {
        let sql=`INSERT INTO Conferenza(Nome, Luogo, Data) VALUES('${this.nome}', '${this.luogo}', '${this.data}')`;
        return sql;           
    }

    getConferenzaByNome() {
        let sql =`SELECT * FROM Conferenza WHERE Nome='${this.nome}'`;
        return sql;
    }

    saveNew() {
        let sql =`INSERT INTO Conferenza(Nome, Luogo, Data)
        SELECT * FROM (SELECT '${this.nome}' as Name, '${this.luogo}' as site, '${this.data}' as date) AS tmp
        WHERE NOT EXISTS (
            SELECT Nome FROM Conferenza WHERE Nome = '${this.nome}'
        ) LIMIT 1`;
        return sql;
    }
}

module.exports = Conferenza;