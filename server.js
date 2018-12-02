const express = require('express')
const path = require('path')
const PORT = process.env.PORT || 5000;
const url = require('url');
var books = require('google-books-search');

var pg = require('pg');
pg.defaults.ssl = true;
require('dotenv').load();
var connectionString = process.env.DATABASE_URL;

const { Pool } = require("pg");
const pool = new Pool({ connectionString: connectionString });

//var myBooksList;
var type;
express()
    .use(express.static(path.join(__dirname, 'public')))
    .set('views', path.join(__dirname, 'views'))
    .set('view engine', 'ejs')

    .get('/books', function (request, response) {
        getBooks(request, response);
    })


    .get('/', (req, res) => res.render('pages/index'))    
    .listen(PORT, () => console.log(`Listening on ${PORT}`))

var defaultOptions = {
    // Google API key
    key: null,
    // Search in a specified field
    field: null,
    // The position in the collection at which to start the list of results (startIndex)
    offset: 0,
    // The maximum number of elements to return with this request (Max 40) (maxResults)
    limit: 30,
    // Restrict results to books or magazines (or both) (printType)
    type: 'all',
    // Order results by relevance or newest (orderBy)
    order: 'relevance',
    // Restrict results to a specified language (two-letter ISO-639-1 code) (langRestrict)
    lang: 'en'
};

function getBooks(request, response) {
    var param = request.query.param;
    type = request.query.type;
    var myBooksList = [];

    getBooksFromDb(param, function (error, myResults) {
        if (error || myResults == null ) {
            response.status(500).json({
                success: false,
                data: error
            });
        } else {
            myBooksList = myResults;

            //for (var i = 0; i < myResults.length; i++) {
            //    var obj = myResults[i];

            //    var oPush = {};
            //    oPush["title"] = obj.title;
            //    oPush["author_id"] = obj.author_id;
            //    myBooksList.push(oPush);
            //}
            //response.status(200).json(person);
        }
    });

    getBookList(param, function (error, results) {
        if (error || results == null) {
            response.status(500).json({
                success: false,
                data: error
            });
        } else {
            var List = results;
            var data = [];

            for (var i = 0; i < List.length; i++) {
                var obj = List[i];
                var authorid = getAuthorId(myBooksList, obj.title, obj.authors[0].replace(/\s/g, '').toLowerCase());
                var valueToPush = {}; 

                valueToPush["id"] = obj.id;
                if (obj.title != undefined)
                {
                    valueToPush["title"] = obj.title;
                }
                else
                {
                    valueToPush["title"] = 'No title listed';
                }                

                if (obj.authors != undefined && obj.authors[0] != undefined)
                {
                    valueToPush["author"] = obj.authors[0];
                }
                else
                {
                    valueToPush["author"] = 'Author Unknown';
                }

                if (obj.publishedDate != undefined && obj.publishedDate.substring(0, 4) != undefined) {
                    valueToPush["copyright"] = obj.publishedDate.substring(0, 4);
                }
                else
                {
                    valueToPush["copyright"] = 0000;
                }

                valueToPush["author_id"] = authorid;

                valueToPush["description"] = obj.description;

                if (obj.industryIdentifiers != undefined && obj.industryIdentifiers[0] != undefined) {
                    var isbn;
                    if (obj.industryIdentifiers[0].type == 'ISBN_13')
                    {
                        isbn = obj.industryIdentifiers[0].identifier;
                    }
                    else
                    {
                        isbn = obj.industryIdentifiers[1].identifier;
                    }
                    valueToPush["isbn"] = isbn;
                }
                else
                {
                    valueToPush["isbn"] = '';
                }

                valueToPush["pages"] = obj.pageCount;

                valueToPush["thumbnail"] = obj.thumbnail;

                valueToPush["link"] = obj.link;

                data.push(valueToPush);
            }

            var params = { data: data };
            response.render('pages/results', params);

        }
    });
}

function getBookList(param, callback) {

    books.search(param, defaultOptions, function (error, results) {
        if (!error) {
            //console.log(results);
            callback(null, results);
        } else {
            console.log(error);
        }
    });
} 

//function getBooksFromDb(request, response) {
//    // First get the person's id
//    var param = request.query.param;

//    getPersonFromDb(param, function (error, results) {

//        if (error || result == null || result.length > 0) {
//            response.status(500).json({
//                success: false,
//                data: error
//            });
//        } else {
//            myBooksList = results;
//            response.status(200).json(person);
//        }
//    });
//}

function getBooksFromDb(param, callback) {
    //console.log("Getting person from DB with id: " + id);
    //var type = request.query.type;

    var sql = "";
    var params;
    switch (type) {
        case 'title':
            params = [param];
            sql = "SELECT b.title, b.author_id, lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) author from book b inner join author a on b.author_id = a.author_id WHERE b.title = $1::VARCHAR(100)";
            break;
        case 'author':
            params = [param.replace(/\s/g, '').toLowerCase()];
            sql = "select b.title, b.author_id, lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) author from book b inner join author a on b.author_id = a.author_id where lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) = $1::VARCHAR(150)";
            break;
        case 'isbn':
            params = [param];
            sql = "SELECT b.title, b.author_id, lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) author from book b inner join author a on b.author_id = a.author_id WHERE b.isbn = $1::VARCHAR(50)";
            break;
        default:
            params = [param.replace(/\s/g, '').toLowerCase()];
            sql = "select b.title, b.author_id, lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) author from book b inner join author a on b.author_id = a.author_id where lower(a.first_name || COALESCE('' || a.middle_name,'') || '' || a.last_name) = $1::VARCHAR(150)";
    }


    

    pool.query(sql, params, function (err, myResults) {
        // If an error occurred...
        if (err) {
            console.log("Error in query: ")
            console.log(err);
            callback(err, null);
        }

        // Log this to the console for debugging purposes.
        //console.log("Found result: " + JSON.stringify(myResults.rows));

        // (The first parameter is the error variable, so we will pass null.)
        callback(null, myResults.rows);
    });

}

function getAuthorId(myBooksList, title, author)
{
    var author_id = 0;    

    for (var i = 0; i < myBooksList.length; i++) {
        var myAuthor = myBooksList[i].author;
        if (myBooksList[i].title == title && myAuthor == author)
            author_id = myBooksList[i].author_id;
    }

    return author_id;
}