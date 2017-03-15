var express = require('express');
var app = express();

app.set('port', (process.env.PORT || 5000));

app.use(express.static(__dirname + '/public'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

app.get('/', function(request, response) {
  response.render('pages/index');
});

app.get('/webcrawler', function(req, res){
  //res.send(req.query);
  
  var python = require('child_process').spawn(
  'python',
  ["WebCrawler/Webcrawler.py"
  , req.query.source
  , req.query.method
  , req.query.nodeCount
  , req.query.depth
  , req.query.keyword]
  );
  var output = "";
  python.stdout.on('data', function(data){ output += data });
  python.on('close', function(code){
    if (code !== 0) {
        return res.send(500, code);
    }
    console.log(code);
    console.log(output);
    console.log(data);
    return res.send(200, output);
  });
  
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
