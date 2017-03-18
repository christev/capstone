// How long to animate a force iteration for (in ms)
var timeStep = 50;

// SVG container size
var width = 960, height = 960;

// These are variables to define the style of the graph
var rootNodeRadius = width/70;
var rootNodeColor = 'lightsteelblue';
var mouseOverRootNodeColor = 'steelblue'
var nodeRadius = width/100;
var nodeBorderWidth = 1;
var nodeBorderColor = 'gray';
var nodeColor = 'lightgray';
var selectedNodeColor = 'whitesmoke'
var mouseOverNodeColor = 'gray';
var mouseOverNodeBorderWidth = 2;
var mouseOverNodeBorderColor = 'gray';
var keywordNodeColor = 'lightgreen';
var mouseOverKeywordNodeColor = 'green';
var linkWidth = 2;
var linkColor = 'gray';
var linkOpacity = .4;
var mouseOverLinkColor = 'gray';
var mouseOverLinkWidth = 3;
var mouseOverLinkOpacity = .8;
var activeNodeWidth = nodeRadius*30;
var activeNodeHeight = nodeRadius*6;
var textSize = 16;
var textBoxWidth = activeNodeWidth;
var textBoxPadding = 8;

// Global scaleFactor to adjust sizes of svg objects when zooming
var scaleFactor = 1,
// Zoom Factor is defined as the maximum scaling factor for svg
// shapes. The shapes will asymptotically approach this scaling limit,
// while the distance between shapes may continue to infinity, A scale
// factor of one means shapes move apart but never grow while zooming.
    zoomFactor = 5;  // Must be >= 1

// Create force-layout
var force = d3.layout.force()
    .size([width, height])
    .linkDistance(width/4)      // Defaults:
    .linkStrength(0.025)         // 0.1
    .friction(0.9)              // 0.9
    .charge(-700)                // -30
    .gravity(0.03)              // 0.1
    .theta(0.8)                 // 0.8
    .alpha(0.1);                // 0.1

// These will be filled in by a callback function
var svg = null, node = null, link = null;

// Create an SVG container
function createSVGContainer(){
    svg = d3.select('#graphContainer')
        // And svg container to the DOM
        .append('svg')
        // Set the svg container dimensions
        .attr('width', width)
        .attr('height', height)
        // Add zooming event listener
        .call(d3.behavior.zoom().on("zoom", onZoom))
        // Deactivate the double-click zooming behavior
        .on("dblclick.zoom", null)
        // Add a group to hold all svg objects
        .append('g')
        .attr('class', 'shapes');

    addLegend();
}

// Callback to be executed after graph data has been received
var setupGraph = function(graph){
    // Need to remove all nodes and links that may already exist
    if (node) node.remove();
    if (link) link.remove();

    // Create an SVG container if it doesn't exist
    if (!svg) createSVGContainer();

    function arrUnique(arr) {
        var cleaned = [];
        arr.forEach(function(itm) {
            var unique = true;
            cleaned.forEach(function(itm2) {
                if (itm.index == itm2.index) unique = false;
            });
            if (unique)  cleaned.push(itm);
        });
        return cleaned;
    }

    graph.nodes = arrUnique(graph.nodes);
    // graph.edges = arrUnique(graph.edges);

    // Add a neighbors array to each node. This will assist in
    // highlighting neighboring nodes when hovering/selecting a node
    for (var i = 0; i < graph.nodes.length; i++){
        graph.nodes[i].neighbors = [];
    }
    // Fill the neighbor arrays
    graph.edges.forEach(function(cur, i, arr){
        graph.nodes[cur.source].neighbors.push(cur.target);
        graph.nodes[cur.target].neighbors.push(cur.source);
    })

    // Set the first node as the root node
    graph.nodes[0].root = true;
    graph.nodes[0].x = width/2;
    graph.nodes[0].y = height/2;

    // Assign the nodes and links to the force layout object
    force.nodes(graph.nodes)
        .links(graph.edges);

    // Add node elements to the SVG container
    node = svg.selectAll('.node')
        // Associate node data with svg node objects
        .data(graph.nodes)
        .enter()
        // Put each node in a separate group
        .append('g')
        .attr('class', 'nodeGroup')
        // Add a rectangle to each group
        .insert('rect', ':first-child')
        // Set the rectangle's class based on its associated data
        .attr('class', function(d) {
            if (d.root) return 'root node';
            else if (d.keyword) return 'keyword node';
            else return 'node';})
        // Set each rectangle's style based on its class
        // Style data is saved on the DOM for each node
        .each(function(d, i){
            var curNode = d3.select(this);
            // If it's a root node
            if (curNode.classed('root')) {
                d.radius = rootNodeRadius;
                d.fill = rootNodeColor;
                d.mo_fill = mouseOverRootNodeColor;
                d.fixed = true;
            }
            else{
                d.radius = nodeRadius;
                d.fixed = false;
                // If it's a keyword node
                if (curNode.classed('keyword')){
                    d.fill = keywordNodeColor;
                    d.mo_fill = mouseOverKeywordNodeColor;
                }
                // Otherwise its just a regular node
                else {
                    d.fill = nodeColor;
                    d.mo_fill = mouseOverNodeColor;
                }
            }
            // Set the properties that are common to all nodes
            d.height = d.radius*2;
            d.width = d.radius*2;
            d.stroke = nodeBorderColor;
            d.strokeWidth = nodeBorderWidth;
            d.mo_stroke = mouseOverNodeBorderColor;
            d.mo_strokeWidth = mouseOverNodeBorderWidth;
            d.active = false; ;
            d.activeHeight = d.radius*2})
        // Now read the style data off the DOM and set the style for each node
        .attr('height', function(d) { return d.height; })
        .attr('width', function(d) { return d.width; })
        .attr('rx', function(d) { return d.radius; })
        .attr('ry', function(d) { return d.radius; })
        .attr('fill', function(d) { return d.fill; })
        .attr('stroke', function(d) { return d.stroke; })
        .attr('stroke-width', function(d) { return d.strokeWidth; })
        // Add event listeners to each node
        .on('mouseover', onMouseOverNode)
        .on('mouseout', onMouseOutNode)
        .on('click', onNodeClicked)
        .call(force.stop().drag()
            .on("dragstart", function(d) {
                // If dragging, block clicking events
                d3.event.sourceEvent.stopPropagation();
            }))
        .call(force.stop().drag()
            .on("drag", function(d) {
                // While dragging, move the location of any node content
                // to follow its associated node
                d3.select(d.contentGroup)
                    .attr('transform', 'translate(' + d.x + ',' + d.y + ')');
            }))
        .call(force.stop().drag()
            .on("dragend", function(d) {
                // Allow clicking events again
                d3.event.sourceEvent.stopPropagation();}));

    // Add link elements to the SVG container
    link = svg.selectAll('.link')
        // Associate link data with svg link objects
        .data(graph.edges)
        .enter().insert('line',':first-child')
        // Add all links to the link class
        .attr('class', 'link')
        // Set the link style properties
        .attr('stroke', linkColor)
        .attr('stroke-width', linkWidth)
        .attr('stroke-opacity', linkOpacity)
        // Set event listeners on each link
        .on('mouseover', onMouseOverLink)
        .on('mouseout', onMouseOutLink);

    // Start the force layout
    force.start();

    // Callback function executes after each force-layout 'tick'
    force.on('tick', function() {
        // Make the text content move with the corresponding nodes
        d3.selectAll('.contentGroup')
            .attr('transform', function(d){
                return 'translate(' + d.x + ',' + d.y + ')' });

        // Update the node positions
        node.attr('x', function(d) { return d.x - d.radius / scaleFactor; })
            .attr('y', function(d) { return d.y - d.radius / scaleFactor; });

        // Update the link positions
        link.attr('x1', function(d) { return d.source.x; })
            .attr('y1', function(d) { return d.source.y; })
            .attr('x2', function(d) { return d.target.x; })
            .attr('y2', function(d) { return d.target.y; });
    })
}

function addLegend(){
    // Add a legend to the SVG container, in a separate group
    var legend = d3.select(svg.node().parentNode)
        .append('g')
        .attr('transform', 'translate(' + 10 + ',' + 10 + ')')
        .attr('class', 'legend');
    var yInd = 0, yLoc = 0, lineSpacing = 1.2*textSize;
    var legendText = legend.append('text')
        .style('font-size', textSize)
        .attr('opacity','.5')
        .append('tspan')
        .style('font-weight', 'bold')
            .attr('x', 0)
            .attr('y', yLoc += lineSpacing)
            .text('Legend:')
        .append('tspan')
        .style('font-weight', 'normal')
            .attr('x', 0)
            .attr('y', yLoc += lineSpacing)
            .text(' Click node to expand')
        .append('tspan')
            .attr('x', 0)
            .attr('y', yLoc += lineSpacing)
            .text(' Shift+click: expand multiple')
        .append('tspan')
            .attr('x', 0)
            .attr('y', yLoc += lineSpacing)
            .text(' Ctrl+click: make sticky')
        .append('tspan')
            .attr('x', 0)
            .attr('y', yLoc += lineSpacing)
            .text(' Click drag: reposition')
        .append('tspan')
            .attr('x', 0)
            .attr('y', yLoc += lineSpacing)
            .text(' Ctrl+drag canvas to pan')
        .append('tspan')
        .style('font-weight', 'bold')
            .attr('x', 0)
            .attr('y', yLoc += 2*lineSpacing)
            .text('Starting page:');
        legend.insert('circle')
            .attr('cx', 10 + rootNodeRadius)
            .attr('cy', yLoc += 0.4*lineSpacing + rootNodeRadius)
            .attr('r', rootNodeRadius)
            .attr('fill', rootNodeColor)
            .attr('stroke', nodeBorderColor)
            .attr('stroke-width', nodeBorderWidth);
        legendText.append('tspan')
            .attr('x', 0)
            .attr('y', yLoc += lineSpacing + rootNodeRadius)
            .text('Keyword pages:');
        legend.insert('circle')
            .attr('cx', 10 + nodeRadius)
            .attr('cy', yLoc += 0.4*lineSpacing + nodeRadius)
            .attr('r', nodeRadius)
            .attr('fill', keywordNodeColor)
            .attr('stroke', nodeBorderColor)
            .attr('stroke-width', nodeBorderWidth);
        legendText.append('tspan')
            .attr('x', 0)
            .attr('y', yLoc += lineSpacing + nodeRadius)
            .text('Other pages:');
        legend.insert('circle')
            .attr('cx', 10 + nodeRadius)
            .attr('cy', yLoc += 0.4*lineSpacing + nodeRadius)
            .attr('r', nodeRadius)
            .attr('fill', nodeColor)
            .attr('stroke', nodeBorderColor)
            .attr('stroke-width', nodeBorderWidth);
}

// Callback to define the behavior after hovering over a node
function onMouseOutNode(d, i) {
    // Remove node from the hover class and mark as modified
    d3.select(this).classed({'hover': false, 'modified': true});

    // Save the context
    var that = this;

    // Select the adjacent nodes
    var nodes = d3.selectAll('.node').select(function(d, j) {
            return d.neighbors.includes(i) ? this : null;
            })
        // Remove nodes from the hoverAdjacent class and mark as modified
        .classed({'hoverAdjacent': false, 'modified': true});

    // Select the incident links
    var links = d3.selectAll('.link').select(function(d, j) {
            return (d.source == that.__data__ || d.target == that.__data__) ? this : null;
            })
        // Remove links from the hoverAdjacent class and mark as modified
        .classed({'hoverAdjacent': false, 'modified': true});

    // Update the visualization
    updateVis();
}

// Callback to define the behavior when hovering over a node
function onMouseOverNode(d, i) {
    // Add node to the hover class and mark as modified
    d3.select(this).classed({'hover': true, 'modified': true});

    // Save the context
    var that = this;

    // Select the adjacent nodes
    node.select(function(e, j) { return e.neighbors.includes(i) ? this : null;})
        // Add nodes to the hoverAdjacent class and mark as modified
        .classed({'hoverAdjacent': true, 'modified': true});

    // Select the incident links
    link.select(function(e, j) {
            return (e.source == that.__data__ || e.target == that.__data__) ? this : null;
            })
        // Add links to the hoverAdjacent class and mark as modified
        .classed({'hoverAdjacent': true, 'modified': true});

    // Update the visualization
    updateVis();
}

// Callback to define the behavior when hovering over a link
function onMouseOverLink(d, i) {
    // Add link to the hover class and mark as modified
    d3.select(this).classed({'hover': true, 'modified': true});

    // Select the adjacent nodes
    node.select(function(e, j) {
            return (d.source.index == e.index || d.target.index == e.index) ? this : null;
            })
        // Add nodes to the hoverAdjacent class and mark as modified
        .classed({'hoverAdjacent': true, 'modified': true});

    // Update the visualization
    updateVis();
}

// Callback to define the behavior after hovering over a link
function onMouseOutLink(d, i) {
    // Remove link from the hover class and mark as modified
    d3.select(this).classed({'hover': false, 'modified': true});

    // Select the adjacent nodes
    node.select(function(e, j) {
            return (d.source.index == e.index || d.target.index == e.index) ? this : null;
            })
        // Remove node from the hoverAdjacent class and mark as modified
        .classed({'hoverAdjacent': false, 'modified': true});

    // Update the visualization
    updateVis();
}

// Callback to change the graph layout when zooming
function onZoom() {
    // Update the global scale factor variable
    scaleFactor = (d3.event.scale - 1) / zoomFactor + 1;

    // SVG transform to change zoom level
    svg.attr("transform",
        "translate(" + d3.event.translate + ")"
        + " scale(" + d3.event.scale + ")");

    // Update node positions
    node.attr('x', function(d) { return d.x - d.radius / scaleFactor; })
        .attr('y', function(d) { return d.y - d.radius / scaleFactor; })
        // Update active node widths
        .attr('width', function(d){
            var selectedNode = d3.select(this);
            return selectedNode.classed('active') ? activeNodeWidth/scaleFactor + "" : d.width/scaleFactor + "";
            })
        // Update active node heights
        .attr('height', function(d){
            var selectedNode = d3.select(this);
            return selectedNode.classed('active') ? d.activeHeight/scaleFactor + "" : d.height/scaleFactor + "";
            })
        // Update node radii
        .attr('rx', function(d){ return d.radius/scaleFactor; })
        .attr('ry', function(d){ return d.radius/scaleFactor; })
        // Mark all nodes as modified
        .classed('modified', true);

    // Mark all links as modified
    link.classed('modified', true);

    // Resize and reposition node text
    d3.selectAll('.contentGroup')
        .each(updateNodeContents);

    // Update the visualization
    updateVis();
}

// Function to define behavior when clicking a node
function onNodeClicked(d){
    // If 'f' held, toggle fixed position status
    if (d3.event.ctrlKey){
        d.fixed = d.fixed ? false : true;
        return;
    }

    // Ignore everything else if dragging
    if (d3.event.defaultPrevented) return;

    // Save the context
    var that = this;

    // Move node to the foreground
    d3.select(this.parentNode).moveToFront();

    // A few useful selections
    var selectedNode = d3.select(this);
    var activeNodes = d3.selectAll('.active');
    var adjacentNodes = node.select(function(e) {
        return d.neighbors.includes(e.index) ? this : null;
        })
    var adjacentLinks = link.select(function(e) {
        return (e.source.index == d.index || e.target.index == d.index) ? this : null;
        })

    // Logical to control activating/deactivating nodes
    var nodeIsActive = selectedNode.classed('active');
    // If there are active nodes
    if (!activeNodes.empty()){
        // Deactivate all active nodes if shift key not held
        if (!d3.event.shiftKey) deactivateAll();
        // Deactivate this node if active
        else if (nodeIsActive) deactivateThis();
    }
    // Activate this node if it initially was not active
    if (!nodeIsActive) activateThis();

    // Deactivates all active nodes
    function deactivateAll(){
        // Select active nodes
        node.filter('.active')
            // Remove nodes from active class and mark as modified
            .classed({'active': false, 'modified': true})
            // Remove the text content from the nodes
            .each(function(e){ removeNodeContents(this, e); });
        // No nodes are adjacent to an active node
        node.filter('.activeAdjacent')
            .classed({'activeAdjacent': false, 'modified': true});
        // No links are incident on an active node
        link.filter('.activeAdjacent')
            .classed({'activeAdjacent': false, 'modified': true});
    }

    // Deactivate the selected node
    function deactivateThis(){
        // Remove node from active class and mark as modified
        selectedNode.classed({'active': false, 'modified': true});
        // For each of the neighboring nodes
        adjacentNodes.each(function(e){
            // Initially remove the neighbor from the activeAdjacent class.
            var neighbor = d3.select(this)
                .classed({'activeAdjacent': false, 'modified': true});
            // But if any presently active node is a neighbor of the neighbor,
            // we'll add it back to the activeAdjacent class.
            var activeNeighbors = node.select(function(f) {
                    return e.neighbors.includes(f.index) ? this : null;
                    }).filter('.active');
            if (!activeNeighbors.empty())
                neighbor.classed({'activeAdjacent': true, 'modified': false});
        });

        // Initially remove each incident link from the activAdjacent class
        adjacentLinks.classed({'activeAdjacent': false, 'modified': true})
            // For each adjacent link
            .each(function(e){
                // Save the context
                var that = this;
                // For each active node in the graph
                node.filter('.active').each(function(f){
                    // If the link is incident upon the node
                    if (e.source.index == f.index || e.target.index == f.index){
                        // Add link back to activeAdjacent class
                        d3.select(that).classed({'activeAdjacent': true, 'modified': false});
                        return;
                    }
                });
        });

        // Remove the contentGroup from the node
        removeNodeContents(that, d);
    }

    // Activate the selected node
    function activateThis(){
        selectedNode.classed({'active': true, 'modified': true});
        adjacentNodes.classed({'activeAdjacent': true, 'modified': true});
        adjacentLinks.classed({'activeAdjacent': true, 'modified': true});
        addNodeContents(that, d);
    }

    // Update the visualization
    updateVis();
}

// Update the properties of all of the svg elements in the graph
function updateVis(){
    updateNodeAttributes();
    updateLinkAttributes();
}

// Update the properties of links that have been modified
function updateLinkAttributes(){
    // Only update the links that have been modified
    link.filter('.modified')
    // Un-mark links as modified
        .classed('modified', false)
        // Update the link color
        .attr('stroke', function(d) {
            var selectedNode = d3.select(this);
            if (selectedNode.classed('activeAdjacent')) return mouseOverLinkColor;
            else if (selectedNode.classed('hoverAdjacent')) return mouseOverLinkColor;
            else if (selectedNode.classed('hover')) return mouseOverLinkColor;
            else return linkColor;
            })
        // Update the link thickness
        .attr('stroke-width', function(d) {
            var selectedNode = d3.select(this);
            if (selectedNode.classed('activeAdjacent')) return mouseOverLinkWidth/scaleFactor;
            else if (selectedNode.classed('hoverAdjacent')) return mouseOverLinkWidth/scaleFactor;
            else if (selectedNode.classed('hover')) return mouseOverLinkWidth/scaleFactor;
            else return linkWidth/scaleFactor;
            })
        // Update the link opacity
        .attr('stroke-opacity', function(d) {
            var selectedNode = d3.select(this);
            if (selectedNode.classed('activeAdjacent')) return mouseOverLinkOpacity;
            else if (selectedNode.classed('hoverAdjacent')) return mouseOverLinkOpacity;
            else if (selectedNode.classed('hover')) return mouseOverLinkOpacity;
            else return linkOpacity;
            });
}

// Update the properties of nodes that have been modified
function updateNodeAttributes(){
    // Only update the nodes that have been modified
    node.filter('.modified')
    // Un-mark nodes as modified
        .classed('modified', false)
        // Update the node color
        .attr('fill', function(d) {
            var selectedNode = d3.select(this);
            if (selectedNode.classed('active')) return selectedNodeColor;
            else if (selectedNode.classed('hover')) return d.mo_fill;
            else return d.fill;
            })
        // Update the node border color
        .attr('stroke', function(d) {
            var selectedNode = d3.select(this);
            if (selectedNode.classed('active')) return d.mo_stroke;
            else if (selectedNode.classed('activeAdjacent')) return d.mo_stroke;
            else if (selectedNode.classed('hover')) return d.mo_stroke;
            else if (selectedNode.classed('hoverAdjacent')) return d.mo_stroke;
            else return d.stroke;
            })
        // Update the node border thickness
        .attr('stroke-width', function(d) {
            var selectedNode = d3.select(this);
            if (selectedNode.classed('active')) return d.mo_strokeWidth/scaleFactor;
            else if (selectedNode.classed('activeAdjacent')) return d.mo_strokeWidth/scaleFactor;
            else if (selectedNode.classed('hoverAdjacent')) return d.mo_strokeWidth/scaleFactor;
            else if (selectedNode.classed('hover')) return d.mo_strokeWidth/scaleFactor;
            else return d.strokeWidth/scaleFactor;
            })
        // Animate the expansion/contraction of clicked nodes
        .transition()
        // After fully expanding, make text within nodes visible
        .each("end", function(d){
            if(d3.select(this).classed('active')){
                var group = d3.select(d.contentGroup);
                group.select('text').attr('opacity', '1'),
                group.select('a').select('text').attr('opacity', '1');
            }})
        // Update the node width
        .attr('width', function(d){
            var selectedNode = d3.select(this);
            return selectedNode.classed('active') ? activeNodeWidth/scaleFactor : d.width/scaleFactor;
            })
        // Update the node height
        .attr('height', function(d){
            var selectedNode = d3.select(this);
            return selectedNode.classed('active') ? d.activeHeight/scaleFactor : d.height/scaleFactor;
            });
}

// Callback to update the size and position of the text within
// active nodes. This is necessary for resizing after zooming.
function updateNodeContents(d){
    // Select the contentGroup
    var contentGroup = d3.select(this);

    // Update the title text
    var titleText = contentGroup.selectAll('text')
        .attr('y', 0)
        .style('font-size', textSize / scaleFactor)
        // Each line of text is in a separate tspan
        .selectAll('tspan')
        // Set the spacing between lines of text
        .attr('dy', textSize / scaleFactor);

    // Get the height of the text that was just added
    var titleBoxHeight = titleText.empty() ? textSize / scaleFactor : titleText.node().getBBox().height;

    // Update the link text
    contentGroup.select('a').select('text')
        // Set the y position beneath the title text
        .attr('y', titleBoxHeight)
        .style('font-size', textSize / scaleFactor)
        .selectAll('tspan')
        // Set the spacing between lines of text
        .attr('dy', textSize / scaleFactor);

}

// Adds the text contents to a node.
// To prevent text appearing before the node has expanded,
// the text is initially set to transparent. Once the text
// has been added, the size of the bounding box will be
// found, which will be used to set the size that the node
// should expand to. Once the node node has expanded to
// encompass the text, the text will be set opaque.
function addNodeContents(node, d){
    // Select the parent node (an svg group)
    var group = d3.select(node.parentNode)
        // Add a new group as a child
        .append('g')
        // Add to contentGroup class
        .classed('contentGroup', true)
        // Set group position to match its corresponding node position
        .attr('transform', 'translate(' + d.x + ',' + d.y + ')');

    // Add a reference to the group to the node data
    d.contentGroup = group.node();

    // Add the web page title to the node
    var titleText = group.append('text')
        .attr('y', 0 + "")
        // Make invisible initially
        .attr('opacity','0')
        .text(d.title)
        .each(wrapText);

    // Get the height of the text that was just added
    var titleBoxHeight = titleText.empty() ? textSize / scaleFactor : titleText.node().getBBox().height;

    // Add the web page link
    var linkText = group.append('a')
        .attr('xlink:href', d.url)
        .attr('target', '_blank')
        .append('text')
        // Set the y position beneath the text that was just added
        .attr('y', titleBoxHeight + "")
        // Make invisible initially
        .attr('opacity','0')
        // Set the link text color
        .style('fill', 'blue')
        .text(d.url)
        .each(wrapText);

    // Save the height of the text to calculate
    d.activeHeight = group.node().getBBox().height + 2 * d.radius;
    // Update the size and position of the text
    group.each(updateNodeContents);
}

// Wrap the text to a width of textBoxWidth.
// This is accomplished by adding 1 character at a time to a
// tspan, checking the width of the tspan, and if it's more than
// textBoxWidth, appending a new tspan. Each line is in a
// different tspan.
function wrapText(d) {
    // Retrieve the text
    var text = d3.select(this),
        // Split the string into a character array and reverse
        chars = text.text().split('').reverse(),
        char,
        // Array to add characters to to create a line
        line = [],
        // Remove the text from the element and append a tspan
        tspan = text.text(null).append('tspan');
    while (char = chars.pop()) {
        // Add a character to the line
        line.push(char);
        // Convert to string and set to tspan text
        tspan.text(line.join(''));
        // See if text length is too much
        if (tspan.node().getComputedTextLength() > (textBoxWidth - 2 * d.radius)) {
            // Remove the extra character from the array
            line.pop();
            // Set the tspan to the line value
            tspan.text(line.join(''));
            // Put the character at the beginning of the new line
            line = [char];
            // Append a new tspan
            tspan = text.append('tspan').attr('x', 0)
            // Position below the previous line
            .attr('dy', textSize)
            .text(char);
        }
    }

}

// Removes the text contents of a node
function removeNodeContents(node, d){
    // Remove the reference to the group from the node data
    d.contentGroup = null;
    // Remove the contentGroup
    d3.select(node.parentNode).select('.contentGroup').remove();
}

// https://github.com/wbkd/d3-extended
// Adds a moveToFront function to d3
d3.selection.prototype.moveToFront = function() {
    return this.each(function(){
        this.parentNode.appendChild(this);
    });
};

// https://github.com/wbkd/d3-extended
// Adds a moveToBack function to d3
d3.selection.prototype.moveToBack = function() {
    return this.each(function() {
        var firstChild = this.parentNode.firstChild;
        if (firstChild) {
            this.parentNode.insertBefore(this, firstChild);
        }
    });
};


// setupGraph(graph);
// d3.json('http://web.engr.oregonstate.edu/~christev/webcrawler.json', setupGraph);
