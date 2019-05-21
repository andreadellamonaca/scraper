class Autore {

    constructor(idAutore, nomeCompleto){
        this.idAutore = idAutore;
        this.nomeCompleto = nomeCompleto;
    }

    save() {
        let sql=`INSERT INTO autore(NomeCompleto) VALUES('${this.nomeCompleto}')`;
        return sql;           
    }

    getAutoreByNomeCompleto() {
        let sql =`SELECT * FROM autore WHERE NomeCompleto='${this.nomeCompleto}'`;
        return sql;
    }

    saveNew() {
        let sql =`INSERT INTO autore(NomeCompleto)
        SELECT * FROM (SELECT '${this.nomeCompleto}') AS tmp
        WHERE NOT EXISTS (
            SELECT NomeCompleto FROM autore WHERE NomeCompleto = '${this.nomeCompleto}'
        ) LIMIT 1`;
        return sql;
    }
}

module.exports = Autore;