class Articolo {

    constructor(idArticolo, titolo, abstract, doi, issn, isbn, anno, idconferenza, idgiornale){
        this.idArticolo = idArticolo;
        this.titolo = titolo;
        this.abstract = abstract;
        this.doi = doi;
        this.issn = issn;
        this.isbn = isbn;
        this.anno = anno;
        this.idconferenza = idconferenza;
        this.idgiornale = idgiornale;
    }

    getArticoloByTitolo_Anno() {
        let sql = `SELECT * FROM articolo WHERE Titolo='${this.titolo}' AND AnnoPubblicazione='${this.anno}'`;
        return sql;
    }

    saveNew() {
        let sql =`INSERT INTO articolo(Titolo, Abstract, DOI, ISSN, ISBN, AnnoPubblicazione, idConferenzaPresentazione, idGiornale)
        SELECT * FROM (SELECT '${this.titolo}', '${this.abstract}', '${this.doi}', '${this.issn}', '${this.isbn}', '${this.anno}', '${this.idconferenza}', '${this.idgiornale}' AS res) AS tmp
        WHERE NOT EXISTS (
            SELECT Titolo, AnnoPubblicazione FROM articolo WHERE Titolo = '${this.titolo}' AND AnnoPubblicazione = '${this.anno}'
        ) LIMIT 1`;
        return sql;
    }

    getArticoloFromIEEE() {
        let sql = `SELECT * FROM articolo INNER JOIN presentein ON articolo.idArticolo=presentein.idArticolo WHERE presentein.idRepository = 1`;
        return sql;
    }

    getArticoloFromMsoftAcademic() {
        let sql = `SELECT * FROM articolo INNER JOIN presentein ON articolo.idArticolo=presentein.idArticolo WHERE presentein.idRepository = 5`;
        return sql;
    }

    getArticoloFromScopus() {
        let sql = `SELECT * FROM articolo INNER JOIN presentein ON articolo.idArticolo=presentein.idArticolo WHERE presentein.idRepository = 4`;
        return sql;
    }

    savedoi() {
        let sql = `UPDATE articolo SET DOI = '${this.doi}' WHERE idArticolo = '${this.idArticolo}'`;
        return sql;
    }

    saveabstract() {
        let sql = `UPDATE articolo SET Abstract = '${this.abstract}' WHERE idArticolo = '${this.idArticolo}'`;
        return sql;
    }

    getArticoloFromSDirect() {
        let sql = `SELECT * FROM articolo INNER JOIN presentein ON articolo.idArticolo=presentein.idArticolo WHERE presentein.idRepository = 3`;
        return sql;
    }
}

module.exports = Articolo;