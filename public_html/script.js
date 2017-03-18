document.addEventListener('DOMContentLoaded', function(){
    document.getElementById("submitDiv").addEventListener('click', requestCrawl);
});

function requestCrawl (event){
    var req = new XMLHttpRequest(),

    startButton = document.getElementById('submitDiv'),

    startUrl = document.getElementById('urlInput').value,
    nodes = document.getElementById('nodesInput').value,
    depth = document.getElementById('depthInput').value,
    keyword = document.getElementById('keywordInput').value,
    method;

    if (document.getElementById('radioDFS').checked) {
        method = document.getElementById('radioDFS').value;
    }
    else if (document.getElementById('radioBFS').checked) {
        method = document.getElementById('radioBFS').value;
    }
    else{
        alert('You must select either Breadth first or Depth first');
        return;
    }

    // var reqURL = 'https://thawing-earth-28163.herokuapp.com/webcrawler/?source=http://www.google.com&method=BFS&nodes=5&depth=0&keyword=game';
   var reqURL = 'https://thawing-earth-28163.herokuapp.com/webcrawler/?source=' + startUrl + '&method=' + method + '&nodes=' + nodes + '&depth=' + depth + '&keyword=' + keyword;

    req.open('GET', reqURL, true);
    req.setRequestHeader('Content-Type', 'application/json');

    req.addEventListener('load',function(){
        if(req.status >= 200 && req.status < 400){
            startButton.style.background = "#60c000";
            startButton.textContent = "Start New Crawl";
            startButton.addEventListener('click', requestCrawl);
                // console.log(req.responseText);
            var graph = JSON.parse(req.responseText);
                // console.log(graph);
            var graph = JSON.parse(graph);
            if(!graph.nodes || !graph.edges){
                console.log("Error in response: Not a JSON graph object");
                startButton.style.background = "#cc0000";
                startButton.textContent = "Error!";
                return;
            }
            setupGraph(graph);
        }
        else {
            startButton.style.background = "#cc0000";
            startButton.textContent = "Error!";
            startButton.addEventListener('click', requestCrawl);
            console.log("Error in network request: " + req.statusText);
        }
    });

    req.send(null);

    startButton.removeEventListener('click', requestCrawl);
    startButton.style.background = "#999999";
    startButton.textContent = "Crawling...";
}
