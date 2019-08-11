/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/*global queue, labels*/

//Global config and graph variables;
//Config is set up in input file and the potentially modified  by user changes to the panel.
//dir and undir graphs store refs to the two flavors of a graph and that can be toggled by the user in the panel

var graph;

var taskNum = 0;

var config;
var allConfigs = {};

//compute default data domains once and use when needed
var defaultDomains = { node: {}, edge: {} };

//object to store scales as a function of attr name;
var scales = {};

//global app and provenance objects;
let app, provenance;

//Legend Scales
var circleScale = d3.scaleLinear().domain([0, 1]);

var edgeScale = d3.scaleLinear().domain([0, 1]);

var height;
var width;

//Dimensions of the actual Vis
var visDimensions = { width: 0, height: 0 };

//Dimensions of the panel with the task, legend, and user response
var panelDimensions = { width: 0, height: 0 };

let taskBarHeight;

var svg;
var margin = { left: 0, right: 100, top: 0, bottom: 0 };

var simulation; //so we're not restarting it every time updateVis is called;

//global sizes
let nodeMarkerLength, nodeMarkerHeight, checkboxSize;

//global scales
let nodeLength,
  quantColors,
  nodeHeight,
  nodeFill,
  catFill,
  nodeStroke,
  edgeColor,
  edgeWidth;

function setGlobalScales() {
  nodeMarkerLength = config.nodeLink.nodeWidth[config.graphSize] || 60;
  nodeMarkerHeight = config.nodeLink.nodeHeight[config.graphSize] || 35;

  checkboxSize = nodeMarkerHeight / 4;
  //Create Scale Functions

  nodeLength = function(node) {
    let nodeSizeScale = d3
      .scaleLinear()
      .range([nodeMarkerLength / 2, nodeMarkerLength * 2])
      .clamp(true);

    //if an attribute has been assigned to nodeSizeAttr, set domain
    if (config.nodeLink.nodeSizeAttr) {
      nodeSizeScale.domain(
        config.attributeScales.node[config.nodeLink.nodeSizeAttr].domain
      );
    }

    let value =
      config.nodeLink.nodeSizeAttr && !config.nodeLink.drawBars
        ? nodeSizeScale(node[config.nodeLink.nodeSizeAttr])
        : nodeMarkerLength;
    //make circles a little larger than just the radius of the marker;
    return value; //config.nodeIsRect ? value : value * 1.3;
  };

  //function that was meant to
  quantColors = function(i) {
    let color = d3.hsl(config.nodeLink.quantColors[i]);
    return color;
  };

  nodeHeight = function(node) {
    let nodeSizeScale = d3
      .scaleLinear()
      .range([nodeMarkerHeight / 2, nodeMarkerHeight * 2])
      .clamp(true);

    //if an attribute has been assigned to nodeSizeAttr, set domain
    if (config.nodeLink.nodeSizeAttr) {
      nodeSizeScale.domain(
        config.attributeScales.node[config.nodeLink.nodeSizeAttr].domain
      );
    }

    let value =
      config.nodeLink.nodeSizeAttr && !config.nodeLink.drawBars
        ? nodeSizeScale(node[config.nodeLink.nodeSizeAttr])
        : nodeMarkerHeight;
    return value; //config.nodeIsRect ? value : value * 1.3;
  };

  nodeFill = function(node) {
    let nodeFillScale = d3.scaleOrdinal();

    //if an attribute has been assigned to nodeFillAttr, set domain
    if (config.nodeLink.nodeFillAttr) {
      nodeFillScale
        .domain(
          config.attributeScales.node[config.nodeLink.nodeFillAttr].domain
        )
        .range(config.attributeScales.node[config.nodeLink.nodeFillAttr].range);
    }

    let value =
      config.nodeLink.nodeFillAttr && !config.nodeLink.drawBars
        ? nodeFillScale(node[config.nodeLink.nodeFillAttr])
        : config.nodeLink.noNodeFill;

    return value;
  };

  //function to determine fill color of nestedCategoricalMarks
  catFill = function(attr, value) {
    //assume there are defined domain and ranges for these
    let nodeFillScale = d3
      .scaleOrdinal()
      .domain(config.attributeScales.node[attr].domain)
      .range(config.attributeScales.node[attr].range);

    return nodeFillScale(value);
  };

  nodeStroke = function(selected) {
    return selected
      ? config.style.selectedNodeColor
      : config.nodeLink.noNodeStroke;
  };

  edgeColor = function(edge) {
    let edgeStrokeScale = d3.scaleOrdinal();

    if (config.nodeLink.edgeStrokeAttr) {
      edgeStrokeScale
        .domain(
          config.attributeScales.edge[config.nodeLink.edgeStrokeAttr].domain
        )
        .range(
          config.attributeScales.edge[config.nodeLink.edgeStrokeAttr].range
        );
    }

    let value = config.nodeLink.edgeStrokeAttr
      ? edgeStrokeScale(edge[config.nodeLink.edgeStrokeAttr])
      : config.nodeLink.noEdgeColor;

    return value;

    // edge.selected
    // ? config.style.selectedEdgeColor
    // : value;
  };

  edgeWidth = function(edge) {
    let edgeWidthScale = d3
      .scaleLinear()
      .domain(config.attributeScales.edge[config.nodeLink.edgeWidthAttr].domain)
      .clamp(true)
      .range([2, 10]);

    let value = config.nodeLink.edgeWidthAttr
      ? edgeWidthScale(edge[config.nodeLink.edgeWidthAttr])
      : config.nodeLink.noEdgeColor;
    return value;
  };

  console.log("finished setting global scales");
}

// Setup function that does initial sizing and setting up of elements for node-link diagram.
function loadVis(id) {
  let targetDiv = d3.select("#targetSize");
  width = targetDiv.style("width").replace("px", "");
  height = targetDiv.style("height").replace("px", "");

  // height = height*0.75;
  taskBarHeight = 74;
  //  console.log(width2,height2)

  visDimensions.width = width * 0.75 - 24;
  visDimensions.height = height - taskBarHeight;

  panelDimensions.width = width * 0.25;
  panelDimensions.height = height - taskBarHeight;

  d3.select("#panelControl").on("click", () => {
    let panel = d3.select("#panelDiv");
    let isVisible = panel.style("display") === "block";
    panel.style("display", isVisible ? "none" : "block");
  });

  d3.select("#visPanel").style("width", panelDimensions.width + "px");

  svg = d3
    .select("#node-link-svg")
    .attr("width", visDimensions.width) //size + margin.left + margin.right)
    .attr("height", visDimensions.height);

  //set up svg and groups for nodes/links
  svg.append("g").attr("class", "links");

  svg.append("g").attr("class", "nodes");

  let parentWidth = d3
    .select("#visPanel")
    .select(".content")
    .node()
    .getBoundingClientRect().width;

  //parentWidth is 0 because the div is hidden at the point this code is run?
  legend = d3
    .select("#legend-svg")
    .attr("width", parentWidth) //size + margin.left + margin.right)
    .attr("height", 250);

  simulation = d3
    .forceSimulation()
    .force(
      "link",
      d3.forceLink().id(function(d) {
        return d.id;
      })
    )
    .force("charge", d3.forceManyBody().strength(-1200))
    .force(
      "center",
      d3.forceCenter(visDimensions.width / 2, visDimensions.height / 2)
    );
  // .force("y", d3.forceY().y(0));

  //TODO combine these two variables into one;

  // tasks = taskList;
  //load in firstTask
  // resetPanel();
  // loadTask(taskList[currentTask])

  // (async function() {

  // tasks = taskList;
  // let firstTask = tasks[0]
  // await loadConfigs(firstTask.taskID);

  // console.log(firstTask)

  //   //apply configs to visualization
  // applyConfig("optimalConfig");

  // //pass in workerID to setupProvenance
  // setUpProvenance(getNodeState(graph.nodes));

  // //Set up observers for provenance graph
  // setUpObserver("nodes", highlightSelectedNodes);
  // // setUpObserver("nodes", highlightAnswerNodes);

  // let baseConfig = await d3.json("../../configs/baseConfig.json");
  // let nodeLinkConfig = await d3.json("../../configs/5AttrConfig.json");
  // let saturatedConfig = await d3.json("../../configs/10AttrConfig.json");

  // allConfigs.nodeLinkConfig = mergeConfigs(baseConfig, nodeLinkConfig);
  // allConfigs.saturatedConfig = mergeConfigs(baseConfig, saturatedConfig);
  // })();
}

async function loadTask(task) {
  config = task.config;

  await loadNewGraph(config.graphFiles[config.loadedGraph]);

  // update global variables from config;
  setGlobalScales();

  //determine x and y positions before starting provenance;
  if (graph.nodes[0].fx === undefined) {
    //scale node positions to this screen;

    let xPos = d3
      .scaleLinear()
      .domain(d3.extent(graph.nodes, n => n.x))
      .range([50, visDimensions.width - 50]);
    let yPos = d3
      .scaleLinear()
      .domain(d3.extent(graph.nodes, n => n.y))
      .range([50, visDimensions.height - 50]);

    graph.nodes.map(n => {
      n.x = xPos(n.x);
      n.y = yPos(n.y);
      n.fx = n.x;
      n.fy = n.y;
      n.savedX = n.fx;
      n.savedY = n.fy;
    });
  } else {
    graph.nodes.map(n => {
      n.fx = n.savedX;
      n.fy = n.savedY;
      n.x = n.savedX;
      n.y = n.savedY;
    });
  }

  //pass in workerID to setupProvenance
  setUpProvenance(graph.nodes, task.taskID, task.order);

  setUpObserver("selected", highlightSelectedNodes);
  setUpObserver("hardSelected", highlightHardSelectedNodes);
  setUpObserver("nodePos", updatePos);

  update();
}

function highlightSelectedNodes(state) {
  console.log("calling highlightSelectedNodes");
  // see if there is at least one node 'clicked'
  //check state not ui, since ui has not yet been updated;
  let hasUserSelection = state.selected.length > 0;

  //set the class of everything to 'muted', except for the selected node and it's neighbors;
  d3.select(".nodes")
    .selectAll(".nodeGroup")
    .classed("muted", d => {
      return (
        config.nodeLink.selectNeighbors &&
        hasUserSelection &&
        !state.selected.includes(d.id) &&
        !state.userSelectedNeighbors[d.id] //this id exists in the dict
      );
    });

  d3.select(".nodes")
    .selectAll(".node")
    .classed("clicked", d => state.selected.includes(d.id));

  d3.select(".links")
    .selectAll(".linkGroup")
    .classed(
      "muted",
      d =>
        config.nodeLink.selectNeighbors &&
        hasUserSelection &&
        !state.userSelectedNeighbors[d.id] //this id exists in the dict
    );
  // .select('path')
  // .style("stroke", edgeColor);

  d3.selectAll(".nodeGroup")
    .select(".node")
    .style("fill", nodeFill) //using local bound data, ok, since state should not influence the fill
    .style("stroke", d => nodeStroke(state.selected.includes(d.id)));
}

function selectNode(node) {
  d3.event.stopPropagation();
  const currentState = app.currentState();

  //find out if this node was selected before;
  let selected = currentState.hardSelected;
  let wasSelected = selected.includes(node.id);

  if (wasSelected) {
    selected = selected.filter(s => s !== node.id);
  } else {
    selected.push(node.id);
  }

  let label = wasSelected ? "Hard Unselected a Node" : "Hard Selected a Node";

  let action = {
    label: label,
    action: () => {
      const currentState = app.currentState();
      //add time stamp to the state graph
      currentState.time = Date.now();
      //Add label describing what the event was
      currentState.event = label;
      //Update actual node data
      currentState.hardSelected = selected;
      return currentState;
    },
    args: []
  };

  provenance.applyAction(action);
  pushProvenance(app.currentState());
}

function highlightHardSelectedNodes(state) {
  console.log("triggered highlightHardSelectedNodes");
  d3.selectAll(".selectBox").classed("selected", d =>
    state.hardSelected.includes(d.id)
  );

  //update the list of selected nodes in the answer panel.
  updateAnswer(graph.nodes.filter(n => state.hardSelected.includes(n.id)));
}

function dragNode() {
  d3.selectAll(".linkGroup")
    .select("path")
    .attr("d", function(d) {
      let path = arcPath(d.type === "mentions", d);
      if (path.includes("null")) {
        console.log("bad path");
      }
      return path;
    });

  let radius = nodeMarkerLength / 2;

  d3.selectAll(".nodeGroup").attr("transform", d => {
    d.x = Math.max(radius, Math.min(visDimensions.width, d.x));
    d.y = Math.max(radius, Math.min(visDimensions.height, d.y));
    return "translate(" + d.x + "," + d.y + ")";
  });
}
function updatePos(state) {
  console.log("calling  updatePos");
  d3.selectAll(".linkGroup")
    .select("path")
    .attr("d", function(d) {
      let path = arcPath(d.type === "mentions", d, state);
      if (path.includes("null")) {
        console.log("bad path");
      }
      return path;
    });

  d3.selectAll(".nodeGroup").attr(
    "transform",
    d =>
      "translate(" + state.nodePos[d.id].x + "," + state.nodePos[d.id].y + ")"
  );
}

function arcPath(leftHand, d, state = false) {
  let source = state
    ? { x: state.nodePos[d.source.id].x, y: state.nodePos[d.source.id].y }
    : d.source;
  let target = state
    ? { x: state.nodePos[d.target.id].x, y: state.nodePos[d.target.id].y }
    : d.target;

  var x1 = leftHand ? source.x : target.x,
    y1 = leftHand ? source.y : target.y,
    x2 = leftHand ? target.x : source.x,
    y2 = leftHand ? target.y : source.y;
  (dx = x2 - x1),
    (dy = y2 - y1),
    (dr = Math.sqrt(dx * dx + dy * dy)),
    (drx = dr),
    (dry = dr),
    (sweep = leftHand ? 0 : 1);
  // siblingCount = countSiblingLinks(graph, d.source, d.target);
  (xRotation = 0), (largeArc = 0);

  // if (siblingCount > 1) {
  //   var siblings = getSiblingLinks(graph, d.source, d.target);
  //   var arcScale = d3
  //     .scaleOrdinal()
  //     .domain(siblings)
  //     .range([1, siblingCount]);

  //   drx = drx / (1 + (1 / siblingCount) * (arcScale(d.type) - 1));
  //   dry = dry / (1 + (1 / siblingCount) * (arcScale(d.type) - 1));
  // }

  return (
    "M" +
    x1 +
    "," +
    y1 +
    "A" +
    drx +
    ", " +
    dry +
    " " +
    xRotation +
    ", " +
    largeArc +
    ", " +
    sweep +
    " " +
    x2 +
    "," +
    y2
  );

  // return ("M" + x1 + "," + y1
  //    + "S" + x2 + "," + y2
  //    + " " + x2 + "," + y2)
}

function updateVis() {
  config.nodeIsRect = config.nodeLink.drawBars;

  let fakeSmallNode = {};
  let fakeLargeNode = {};

  let nodeSizeAttr = config.nodeLink.nodeSizeAttr;
  let edgeWidthAttr = config.nodeLink.edgeWidthAttr;

  fakeSmallNode[nodeSizeAttr] =
    config.attributeScales.node[nodeSizeAttr].domain[0];
  fakeLargeNode[nodeSizeAttr] =
    config.attributeScales.node[nodeSizeAttr].domain[1];

  fakeSmallNode[edgeWidthAttr] =
    config.attributeScales.edge[edgeWidthAttr].domain[0];
  fakeLargeNode[edgeWidthAttr] =
    config.attributeScales.edge[edgeWidthAttr].domain[1];

  circleScale.range([nodeLength(fakeSmallNode), nodeLength(fakeLargeNode)]);

  edgeScale.range([edgeWidth(fakeSmallNode), edgeWidth(fakeLargeNode)]);

  //create scales for bars;
  let barAttributes = config.nodeAttributes.filter(isQuant);

  let scaleColors = {}; //Object to store which color to use for which scales

  let barPadding = 3;

  barAttributes.map((b, i) => {
    let scale = d3
      .scaleLinear()
      .domain(config.attributeScales.node[b].domain)
      .range([0, nodeMarkerHeight - 2 * barPadding])
      .clamp(true);

    let domainKey = scale.domain().join("-");
    scaleColors[domainKey] = "";

    //save scale and color to use with that attribute bar
    scales[b] = { scale, domainKey };
  });

  let singleDomain = Object.keys(scaleColors).length === 1;
  //Assign one color per unique domain;

  //if only using one domain, use light grey; otherwise, use colors;
  Object.keys(scaleColors).map((domainKey, i) => {
    scaleColors[domainKey] = singleDomain ? "#afafaf" : quantColors(i);
  });

  Object.keys(scales).map(
    s => (scales[s].fill = scaleColors[scales[s].domainKey])
  );

  //Drawing Graph
  {
    //Draw Links
    let link = d3
      .select(".links")
      .selectAll(".linkGroup")
      .data(graph.links, l => l.id);

    let linkEnter = link
      .enter()
      .append("g")
      .attr("class", "linkGroup");

    linkEnter.append("path").attr("class", "links");

    linkEnter
      .append("text")
      .attr("class", "edgeArrow")
      .attr("dy", 4)
      .append("textPath")
      .attr("startOffset", "50%");

    link.exit().remove();

    link = linkEnter.merge(link);

    link.classed("muted", false);

    link
      .select("path")
      .style("stroke-width", edgeWidth)
      .style("stroke", edgeColor)
      .style("opacity", 0.4)
      .attr("id", d => d.id);

    // TO DO , set ARROW DIRECTION DYNAMICALLY
    link
      .select("textPath")
      .attr("xlink:href", d => "#" + d.id)
      .text(d => (config.isDirected ? (d.type === "mentions" ? "▶" : "◀") : ""))
      .style("fill", edgeColor)
      .style("stroke", edgeColor);

    //draw Nodes
    var node = d3
      .select(".nodes")
      .selectAll(".nodeGroup")
      .data(graph.nodes, n => n.id);

    let nodeEnter = node
      .enter()
      .append("g")
      .attr("class", "nodeGroup");

    nodeEnter.append("rect").attr("class", "node");

    nodeEnter.append("rect").attr("class", "labelBackground");

    nodeEnter.append("text").classed("label", true);

    nodeEnter.append("rect").classed("selectBox", true);

    node.exit().remove();

    node = nodeEnter.merge(node);

    node.classed("muted", false);

    node
      .select(".node")
      .attr("x", d => -nodeLength(d) / 2 - 4)
      .attr("y", d => -nodeHeight(d) / 2 - 4)
      .attr("width", d => nodeLength(d) + 8)
      .attr("height", d =>
        config.nodeIsRect ? nodeHeight(d) + 8 : nodeLength(d) + 8
      )
      .style("fill", nodeFill)
      .style("stroke", d =>
        nodeStroke(app.currentState().selected.includes(d.id))
      )
      .attr("rx", d => (config.nodeIsRect ? nodeLength(d) / 20 : nodeLength(d)))
      .attr("ry", d => (config.nodeIsRect ? nodeHeight(d) / 20 : nodeHeight(d)))
      .classed("clicked", d => app.currentState().selected.includes(d.id));

    node
      .select("text")
      .classed("selected", d => d.hardSelect)
      .style("font-size", config.nodeLink.labelSize[config.graphSize])
      .text(d => d[config.nodeLink.labelAttr])
      .attr("y", d =>
        config.nodeLink.drawBars ? -nodeHeight(d) * 0.5 - 4 : ".5em"
      )
      .attr("dx", function(d) {
        return (
          -d3
            .select(this)
            .node()
            .getBBox().width / 2
        );
      })
      .on("click", selectNode);

    node
      .select(".labelBackground")
      .attr("width", function(d) {
        let textWidth = d3
          .select(d3.select(this).node().parentNode)
          .select(".label")
          .node()
          .getBBox().width;

        //make sure label box spans the width of the node
        return d3.max([textWidth, nodeLength(d) + 4]);
      })
      .attr("height", "1em")
      .attr("x", function(d) {
        let textWidth = d3
          .select(d3.select(this).node().parentNode)
          .select("text")
          .node()
          .getBBox().width;

        //make sure label box spans the width of the node
        return d3.min([-textWidth / 2, -nodeLength(d) / 2 - 2]);
      })
      .attr("y", d =>
        config.nodeLink.drawBars ? -nodeHeight(d) * 0.5 - 16 : "-.5em"
      );

    node
      .select(".selectBox")
      .classed("selected", d => d.hardSelect)
      .attr("width", checkboxSize)
      //if there is no selection to be made for this task, don't draw the checkbox
      .attr(
        "height",
        taskList[currentTask].replyType !== "value" ? checkboxSize : 0
      )
      .attr("x", function(d) {
        let nodeLabel = d3
          .select(d3.select(this).node().parentNode)
          .select("text");

        let textWidth = nodeLabel.node().getBBox().width;
        return -textWidth / 2 - checkboxSize - 5;
      })
      .attr("y", d =>
        config.nodeLink.drawBars
          ? -(nodeHeight(d) / 2 + 4 + checkboxSize)
          : -checkboxSize / 2
      )
      .on("click", selectNode);

    node.call(
      d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended)
    );
  }

  //Drawing Nested Bar Charts
  {
    // //  Separate enter/exit/update for bars so as to bind to the correct data;

    let drawCat =
      Object.keys(config.nodeAttributes.filter(isCategorical)).length > 0;
    let radius = drawCat ? nodeMarkerHeight * 0.15 : 0;
    let padding = drawCat ? 3 : 0;
    let xPos = drawCat ? nodeMarkerLength / 2 - radius : 0;

    let barAttrs = config.nodeLink.drawBars
      ? config.nodeAttributes.filter(isQuant)
      : [];

    let numBars = barAttrs.length;
    let nodeWidth = nodeMarkerLength - barPadding - radius * 2 - padding;
    let barWidth = nodeWidth / numBars - barPadding;

    let scaleStart = -nodeMarkerLength / 2 + barPadding;
    let scaleEnd = scaleStart + (numBars - 1) * (barWidth + barPadding);

    let barXScale = d3
      .scaleLinear()
      .domain([0, numBars - 1])
      .range([scaleStart, scaleEnd]);

    let bars = node
      .selectAll(".bars")
      //for each bar associate the relevant data from the parent node, and the attr name to use the correct scale
      .data(
        d =>
          barAttrs.map(b => {
            return { data: d[b], attr: b };
          }),
        d => d.attr
      );

    let barsEnter = bars
      .enter()
      .append("g")
      .attr("class", "bars");

    barsEnter
      .append("rect")
      .attr("class", "frame")
      .append("title");

    barsEnter
      .append("rect")
      .attr("class", "bar")
      .append("title");

    bars.exit().remove();

    bars = barsEnter.merge(bars);

    bars.selectAll("rect").attr("width", barWidth);

    bars.selectAll("title").text(function(d) {
      return d.attr + " : " + d.data;
    });

    bars.attr("transform", (d, i) => {
      return "translate(" + barXScale(i) + ",0)";
    });

    bars
      .select(".frame")
      .attr("height", d => scales[d.attr].scale.range()[1])
      .attr("y", d => -scales[d.attr].scale.range()[1] / 2)
      .style("stroke", d => scales[d.attr].fill);

    bars
      .select(".bar")
      .classed("clipped", d => d.data > scales[d.attr].scale.domain()[1])
      .attr("height", d => scales[d.attr].scale(d.data))
      .attr(
        "y",
        d => nodeMarkerHeight / 2 - barPadding - scales[d.attr].scale(d.data)
      )
      .style("fill", d => scales[d.attr].fill);

    d3.select("#nodeBarsSelect")
      .selectAll("label")
      .style("color", "#a6a6a6")
      .style("font-weight", "normal");

    //color the text from the panel accordingly
    d3.select("#nodeQuantSelect")
      .selectAll("label")
      .style("color", d =>
        barAttrs.includes(d.attr) ? scales[d.attr].fill : "#b2afaf"
      )
      .style("font-weight", "bold");

    let catAttrs = config.nodeLink.drawBars
      ? config.nodeAttributes.filter(isCategorical)
      : [];

    let yRange =
      catAttrs.length < 2
        ? [0, 0]
        : [-nodeMarkerHeight * 0.2, nodeMarkerHeight * 0.2];

    let catYScale = d3
      .scaleLinear()
      .domain([0, catAttrs.length - 1])
      .range(yRange);

    let catGlyphs = node
      .selectAll(".categorical")
      //for each circle associate the relevant data from the parent node
      .data(
        d =>
          catAttrs.map(attr => {
            let valuePos = config.attributeScales.node[attr].domain.indexOf(
              d[attr]
            );
            return {
              data: d[attr],
              attr,
              label: config.attributeScales.node[attr].legendLabels[valuePos]
            };
          }),
        d => d.attr
      );

    let catGlyphsEnter = catGlyphs
      .enter()
      .append("g")
      .attr("class", "categorical");

    catGlyphsEnter.append("rect");
    catGlyphsEnter.append("text");

    catGlyphs.exit().remove();

    catGlyphs = catGlyphsEnter.merge(catGlyphs);

    catGlyphs.attr(
      "transform",
      (d, i) =>
        "translate(" + (xPos - radius) + "," + (catYScale(i) - radius) + ")"
    );
    // .attr("x", xPos - radius)
    // .attr("y", (d, i) => catYScale(i) - radius)

    catGlyphs
      .select("rect")
      .style("fill", d => catFill(d.attr, d.data))
      .attr("width", d =>
        config.attributeScales.node[d.attr].type === "Text"
          ? radius * 2
          : radius * 2
      )
      .attr("height", radius * 2)
      .attr("rx", d =>
        config.attributeScales.node[d.attr].glyph === "square" ? 0 : radius * 2
      )
      .attr("ry", d =>
        config.attributeScales.node[d.attr].glyph === "square" ? 0 : radius * 2
      );

    catGlyphs
      .select("text")
      // .text(d=>config.attributeScales.node[d.attr].glyph === 'square' ? d.label : '')
      .attr("y", radius * 2)
      .attr("x", radius * 2)
      .style("text-anchor", "start");
  }

  d3.select("#exportGraph").on("click", () => {
    let graphCopy = JSON.parse(JSON.stringify(graph));

    // graphCopy.links.map(l => {
    //   l.index = undefined;
    //   l.source = l.source.id;
    //   l.target = l.target.id;
    // });
    // graphCopy.nodes.map(n => {
    //   n.index = undefined;
    //   n.vx = undefined;
    //   n.vy = undefined;
    //   n.fx = n.x;
    //   n.fy = n.y;
    // });

    let newGraph = { nodes: [], links: [] };

    graphCopy.links.map(l => {
      newLink = {};
      l.index = undefined;
      l.weight = l.count;
      let source = graphCopy.nodes.find(n => n.id === l.source.id);
      newLink.source = graphCopy.nodes.indexOf(source);

      let target = graphCopy.nodes.find(n => n.id === l.target.id);
      newLink.target = graphCopy.nodes.indexOf(target);
      newLink.id = newGraph.links.length;
      l.id = newLink.id;

      newGraph.links.push(newLink);
    });

    graphCopy.nodes.map(n => {
      let newNode = {};
      newNode.name = n.shortName;
      newNode.id = n.id;
      newGraph.nodes.push(newNode);
    });

    var items = graphCopy.links;
    const replacer = (key, value) => (value === null ? "" : value); // specify how you want to handle null values here
    const header = Object.keys(items[0]).filter(
      k => k !== "source" && k !== "target"
    );
    let csv = items.map(row =>
      header
        .map(fieldName => JSON.stringify(row[fieldName], replacer))
        .join(",")
    );
    csv.unshift(header.join(","));
    csv = csv.join("\r\n");

    // let parseInputFilename =
    // let filename = config.isDirected ? config.directedGraph : config.undir_graph;

    // console.log(JSON.stringify(newGraph));
  });

  d3.select("#clear-selection").on("click", () => {
    // set app.currentState() selected to empty;

    let action = {
      label: "cleared all selected nodes",
      action: () => {
        const currentState = app.currentState();
        //add time stamp to the state graph
        currentState.time = Date.now();
        //Add label describing what the event was
        currentState.event = "cleared all selected nodes";
        //Update actual node data
        currentState.selected = [];
        currentState.selectedNeighbors = {};
        return currentState;
      },
      args: []
    };

    provenance.applyAction(action);
    pushProvenance(app.currentState());

    // let clearSelection = function(d) {
    //   let isNode = d.userSelectedNeighbors !== undefined;

    //   d.selected = false;
    //   if (isNode) {
    //     d.userSelectedNeighbors = [];
    //   }
    //   return true;
    // };

    // d3.selectAll(".node").classed("clicked", false);

    // d3.select(".nodes")
    //   .selectAll(".nodeGroup")
    //   .filter(clearSelection)
    //   .classed("muted", false);

    // d3.select(".links")
    //   .selectAll(".linkGroup")
    //   .filter(clearSelection)
    //   .classed("muted", false);

    // node
    //   .select(".node")
    //   .style("fill", nodeFill)
    // .style("stroke", nodeStroke);
  });

  d3.select("#search-input").on("change", function() {
    let selectedOption = d3.select(this).property("value");

    //empty search box;
    if (selectedOption.length === 0) {
      return;
    }

    //find the right nodeObject
    node = graph.nodes.find(n => n.shortName === selectedOption);

    if (!node) {
      return;
    }
    let isSelected = node.selected;

    //Only 'click' node if it isn't already selected;
    if (!isSelected) {
      nodeClick(node, true);
    }
  });

  node.on("click", d => nodeClick(d));

  //function that updates the state, and includes a flag for when this was done through a search
  function nodeClick(node, search = false) {
    const currentState = app.currentState();

    //find out if this node was selected before;
    let selected = currentState.selected;
    let wasSelected = selected.includes(node.id);

    if (wasSelected) {
      selected = selected.filter(s => s !== node.id);
    } else {
      selected.push(node.id);
    }

    let neighbors = tagNeighbors(
      node,
      !wasSelected,
      currentState.userSelectedNeighbors
    );

    let label = search
      ? "Searched for Node"
      : wasSelected
      ? "Unselect Node"
      : "Select Node";

    let action = {
      label: label,
      action: () => {
        const currentState = app.currentState();
        //add time stamp to the state graph
        currentState.time = Date.now();
        //Add label describing what the event was
        currentState.event = label;
        //Update actual node data
        currentState.selected = selected;
        currentState.userSelectedNeighbors = neighbors;
        //If node was searched, push him to the search array
        if (search) {
          currentState.search.push(node.id);
        }
        return currentState;
      },
      args: []
    };

    provenance.applyAction(action);
    pushProvenance(app.currentState());
  }

  function tagNeighbors(clickedNode, wasClicked, userSelectedNeighbors) {
    if (!config.nodeLink.selectNeighbors) {
      return {};
    }

    //iterate through the neighbors of the currently clicked node only and set or remove itself from the relevant lists;
    clickedNode.neighbors.map(neighbor => {
      toggleSelection(neighbor);
    });

    //'tag or untag neighboring links as necessary
    graph.links.map(link => {
      if (
        link.source.id == clickedNode.id ||
        link.target.id == clickedNode.id
      ) {
        toggleSelection(link.id);
      }
    });

    //helper function that adds or removes the clicked node id from the userSelectedNeighbors map as necessary
    function toggleSelection(target) {
      if (wasClicked) {
        userSelectedNeighbors[target]
          ? userSelectedNeighbors[target].push(clickedNode.id)
          : (userSelectedNeighbors[target] = [clickedNode.id]);
      } else {
        if (userSelectedNeighbors[target]) {
          userSelectedNeighbors[target] = userSelectedNeighbors[target].filter(
            n => n !== clickedNode.id
          );

          // if array is empty, remove key from dict;
          if (userSelectedNeighbors[target].length === 0) {
            delete userSelectedNeighbors[target];
          }
        }
      }
    }

    return userSelectedNeighbors;
  }

  //set up simulation
  simulation.nodes(graph.nodes).on("tick", ticked);
  simulation
    .force("link")
    .links(graph.links)
    .distance(l => l.count);
  simulation.force(
    "collision",
    d3.forceCollide().radius(d => d3.max([nodeLength(d), nodeHeight(d)]))
  );

  //if source/target are still strings from the input file
  if (graph.links[0].source.id === undefined) {
    //restablish link references to their source and target nodes;
    graph.links.map(l => {
      l.source =
        graph.nodes.find(n => n.id === l.source) ||
        graph.nodes[l.source] ||
        l.source;
      l.target =
        graph.nodes.find(n => n.id === l.target) ||
        graph.nodes[l.target] ||
        l.target;
    });
  }
  //check to see if there are already saved positions in the file, if not
  //run simulation to get fixed positions;

  //remove collision force
  // simulation.force('collision',null);

  dragNode();

  // else {
  //   graph.nodes.map(n => {
  //     n.x = 0;
  //     n.y = 0;
  //     n.vx = null;
  //     n.vy = null;
  //     n.fx = null;
  //     n.fy = null;
  //   });

  //   for (var i = 0; i < 2000; ++i) simulation.tick();
  //   simulation.stop();

  //   //  add a collision force that is proportional to the radius of the nodes;
  //   simulation.force("collision", d3.forceCollide().radius(d => nodeLength(d)));

  //   simulation.alphaTarget(0.1).restart();
  // }

  d3.select("#stop-simulation").on("click", () => {
    simulation.stop();
    graph.nodes.map(n => {
      n.savedX = n.x;
      n.savedY = n.y;
    });
  });

  d3.select("#start-simulation").on("click", () => {
    simulation.alphaTarget(0.1).restart();
  });

  d3.select("#release-nodes").on("click", () => {
    graph.nodes.map(n => {
      n.fx = null;
      n.fy = null;
    });
    simulation.alphaTarget(0.1).restart();
  });

  function ticked() {
    dragNode();
  }

  //Flag to distinguish a drag from a click.
  let wasDragged = false;

  function dragstarted(d) {
    // if (!d3.event.active) simulation.alphaTarget(0.1).restart();
    d.fx = d.x;
    d.fy = d.y;
    // dragging = true;
  }
  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
    d.x = d3.event.x;
    d.y = d3.event.y;
    dragNode();
    wasDragged = true;

    // console.log('dragged')
  }
  function dragended(d) {
    if (wasDragged) {
      //update node position in state graph;
      // updateState("Dragged Node");

      let action = {
        label: "Dragged Node",
        action: () => {
          const currentState = app.currentState();
          //add time stamp to the state graph
          currentState.time = Date.now();
          //Add label describing what the event was
          currentState.event = "Dragged Node";
          //Update node positions
          graph.nodes.map(
            n => (currentState.nodePos[n.id] = { x: n.x, y: n.y })
          );
          return currentState;
        },
        args: []
      };

      provenance.applyAction(action);
      pushProvenance(app.currentState());
    }
    wasDragged = false;
  }

  drawLegend();
}

function drawLegend() {
  //draw legend based on config;

  let legendElement = d3
    .select("#legend-svg")
    .selectAll(".legendGroup")
    .data(["upperGroup", "lowerGroup"], d => d);

  let legendElementEnter = legendElement
    .enter()
    .append("g")
    .attr("class", "legendGroup");

  legendElement.exit().remove;

  legendElement = legendElementEnter.merge(legendElement);
  legendElement.attr("class", d => d + " legendGroup");

  let legend = {
    width: d3.select("#legend-svg").attr("width"),
    height: d3.select("#legend-svg").attr("height"),
    padding: 10
  };

  let drawBars = config.nodeLink.drawBars;

  let quantAttributes = drawBars ? config.nodeAttributes.filter(isQuant) : [];
  let catAttributes = drawBars
    ? config.nodeAttributes.filter(isCategorical)
    : [];

  let colorAttribute = config.nodeLink.nodeFillAttr;
  let sizeAttribute = drawBars ? [] : config.nodeLink.nodeSizeAttr;
  let edgeAttribute = config.nodeLink.edgeWidthAttr;

  let edgeStrokeScale = d3
    .scaleOrdinal()
    .domain(config.attributeScales.edge["type"].domain)
    .range(config.attributeScales.edge["type"].range);

  let edgeAttributeValues = config.attributeScales.edge[edgeAttribute].domain;
  let edgeTypes = config.isMultiEdge ? ["mentions", "retweet"] : [];

  let colorAttributeValues =
    drawBars || !colorAttribute
      ? []
      : config.attributeScales.node[config.nodeLink.nodeFillAttr].legendLabels;
  let sizeAttributeValues = drawBars
    ? []
    : config.attributeScales.node[config.nodeLink.nodeSizeAttr].domain;

  let barWidth = 20;
  let barPadding = 30;
  let barHeight = 70;

  let circleRadius = 40;
  let circlePadding = 10;

  let squarePadding = 10;

  let labelRotate = -90;

  let squareSize = barHeight * 0.3;

  // let yRange =
  //     catAttributes.length < 2
  //     ? [barHeight/2, barHeight/2]
  //     : [barHeight/4, barHeight*0.75];

  // let yScale = d3
  //   .scaleLinear()
  //   .domain([0, catAttributes.length - 1])
  //   .range(yRange);

  let format = d3.format("2.2s");

  let upperGroup = d3.select(".upperGroup");
  let lowerGroup = d3.select(".lowerGroup");

  let upperGroupElement;
  // let lowerGroupElement

  // draw nestedBars legend

  let bars = upperGroup
    .selectAll(".legendBar")
    //for each bar associate the relevant data from the parent node, and the attr name to use the correct scale
    .data(quantAttributes, d => d);

  let barsEnter = bars
    .enter()
    .append("g")
    .attr("class", "legendBar");

  barsEnter
    .append("rect")
    .attr("class", "frame")
    .append("title");

  barsEnter.append("rect").attr("class", "bar");
  barsEnter.append("text").attr("class", "legendLabel");
  barsEnter.append("text").attr("class", "domainEnd");

  bars.exit().remove();

  bars = barsEnter.merge(bars);

  bars.selectAll("rect").attr("width", barWidth);

  bars.attr("transform", (d, i) => {
    return "translate(" + i * (barWidth + barPadding) + ",0)";
  });

  bars
    .select(".frame")
    .attr("height", barHeight)
    .attr("y", -barHeight)
    .attr("x", 18)
    .style("stroke", d => scales[d].fill);

  bars
    .select(".bar")
    .attr("height", barHeight * 0.7)
    .attr("y", -barHeight * 0.7)
    .attr("x", 18)
    .style("fill", d => scales[d].fill);

  bars
    .select(".legendLabel")
    .text(d => config.attributeScales.node[d].label)
    // .attr("transform", "translate(" + barWidth/2 + "," + (-barHeight-5) +")")
    .attr("transform", "translate(10,0) rotate(" + labelRotate + ")")
    .style("text-anchor", "start")
    // .style("fill","white")
    .style("font-weight", "bold");
  // .style("font-size",barWidth/2)

  bars
    .select(".domainEnd")
    .text(d => format(config.attributeScales.node[d].domain[1]))
    // .attr("transform", "translate(" + (barWidth+3) + "," + (-barHeight+10) +")")
    .attr(
      "transform",
      "translate(" + (barWidth / 2 + 18) + "," + (-barHeight - 5) + ")"
    )
    .style("text-anchor", "middle");

  let catLegend = lowerGroup
    .selectAll(".catLegend")
    //for each bar associate the relevant data from the parent node, and the attr name to use the correct scale
    .data(catAttributes, d => d);

  let catLegendEnter = catLegend
    .enter()
    .append("g")
    .attr("class", "catLegend");

  // squaresEnter.append("rect").attr("class", "square");

  catLegendEnter.append("text").attr("class", "catLabel");
  catLegendEnter.append("g").attr("class", "categoricalScale");

  catLegend.exit().remove();

  catLegend = catLegendEnter.merge(catLegend);

  catLegend
    .select(".catLabel")
    .text(d => config.attributeScales.node[d].label)
    // .attr("transform", (d,i)=> "translate(0," + (yScale(i)+squareSize/4) +  ")")
    .attr("transform", (d, i) => "translate(0,0)")
    .style("font-weight", "bold")
    .style("text-anchor", "start");

  let catGlyphs = catLegend
    .select(".categoricalScale")
    .selectAll(".catGlyphs")
    .data((d, ii) =>
      config.attributeScales.node[d].domain.map(
        (domain, i) => {
          return {
            pos: ii,
            attribute: d,
            value: domain,
            legendLabel: config.attributeScales.node[d].legendLabels[i],
            fill: config.attributeScales.node[d].range[i]
          };
        },
        d => d.attribute
      )
    );

  let catGlyphsEnter = catGlyphs
    .enter()
    .append("g")
    .attr("class", "catGlyphs");

  catGlyphsEnter.append("rect");
  catGlyphsEnter.append("text");

  catGlyphs.exit().remove();

  catGlyphs = catGlyphsEnter.merge(catGlyphs);

  catGlyphs
    .select("rect")
    .attr("width", squareSize)
    .attr("height", squareSize)
    .attr("rx", d =>
      config.attributeScales.node[d.attribute].glyph === "square"
        ? 0
        : squareSize * 2
    )
    .attr("ry", d =>
      config.attributeScales.node[d.attribute].glyph === "square"
        ? 0
        : squareSize * 2
    )

    .attr("fill", d => d.fill);

  catGlyphs
    .select("text")
    .text(d => d.legendLabel)
    .attr(
      "transform",
      d => "translate(" + (squareSize + 3) + "," + squareSize / 2 + ")"
    )
    .style("text-anchor", "start");

  // .attr("transform",d=> "translate(" + (d.legendLabel.length<3?  0: squareSize) + "," + (d.pos === 0 ? -5 : d.legendLabel.length> 2 ? squareSize+5 : squareSize*1.7) + ") rotate(" + (d.legendLabel.length>2? labelRotate  : 0) + ")")
  // .style("text-anchor",d=>d.legendLabel.length>2 && d.pos === 1 ? "end":"start")

  // catGlyphs.attr("transform", (d, i) => {
  //   return "translate(" + i*(squareSize + squarePadding) + "," + (yScale(d.pos)-barHeight-squareSize/2) + ")";
  // });

  catGlyphs.attr("transform", (d, i) => {
    return "translate(0," + (i * (squareSize + squarePadding) + 10) + ")";
  });

  // catLegend.select('text')
  // .text(d=>d.value)
  // .attr("transform",d=> "translate(" + (squareSize+2) + "," + squareSize + ") rotate(0)")
  // // .style("text-anchor",d=>d.pos === 0 ? "start":"end")

  catLegend.attr("transform", (d, i) => {
    return "translate(" + i * 80 + ",0)";
  });

  //draw color/size legend

  let circles = upperGroup
    .selectAll(".legendBarCircles")
    //for each bar associate the relevant data from the parent node, and the attr name to use the correct scale
    .data(
      colorAttributeValues.map((c, i) => {
        return {
          value: c,
          fill: config.attributeScales.node[colorAttribute].range[i]
        };
      })
    );

  let circlesEnter = circles
    .enter()
    .append("g")
    .attr("class", "legendBarCircles");

  circlesEnter.append("rect").attr("class", "circle");

  circlesEnter.append("text").attr("class", "legendLabel");

  circles.exit().remove();

  circles = circlesEnter.merge(circles);

  circles.attr("transform", (d, i) => {
    return "translate(" + i * (circleRadius + circlePadding) + ",0)";
  });

  circles
    .select(".circle")
    .attr("height", circleRadius)
    .attr("width", circleRadius)
    // .attr("y", -circleRadius-20)
    .style("fill", d => d.fill)
    .attr("rx", circleRadius)
    .attr("ry", circleRadius);

  circles
    .select(".legendLabel")
    .text(d => d.value)
    .attr(
      "transform",
      "translate(" + circleRadius / 2 + "," + (circleRadius / 2 + 5) + ")"
    )
    .style("text-anchor", "middle")
    .style("font-weight", "bold")
    .style("fill", "white");
  //render lower group in legend.

  let lowerLegendGroups = drawBars
    ? [
        {
          label: config.attributeScales.edge[edgeAttribute].label,
          domain: edgeAttributeValues,
          type: "edgeWidth"
        }
      ]
    : [
        {
          label: config.attributeScales.node[sizeAttribute].label,
          domain: sizeAttributeValues,
          type: "node"
        },
        {
          label: config.attributeScales.edge[edgeAttribute].label,
          domain: edgeAttributeValues,
          type: "edgeWidth"
        }
      ];

  if (config.isMultiEdge) {
    lowerLegendGroups.push({
      label: config.attributeScales.edge.type.label,
      domain: edgeTypes,
      type: "edgeType"
    });
  }

  let node_link_legend = lowerGroup
    .selectAll(".node_link_legend")
    .data(lowerLegendGroups);

  let node_link_legendEnter = node_link_legend
    .enter()
    .append("g")
    .attr("class", "node_link_legend");

  node_link_legend.exit().remove();

  node_link_legend = node_link_legendEnter.merge(node_link_legend);

  //compute width of all .catLegend groups first:
  let catLegendWidth = 0;

  d3.selectAll(".catLegend").each(function() {
    catLegendWidth =
      catLegendWidth +
      d3
        .select(this)
        .node()
        .getBBox().width;
  });

  node_link_legend.attr(
    "transform",
    (d, i) =>
      "translate(" + (catLegendWidth + 20 + i * legend.width * 0.35) + ",0)"
  );

  //add label to each group

  let label = node_link_legend.selectAll(".axisLabel").data(d => [d.label]);

  let labelEnter = label
    .enter()
    .append("text")
    .attr("class", "axisLabel");

  label.exit().remove();

  label = labelEnter.merge(label);

  label.text(d => d.label);

  let sizeCircles = node_link_legend
    .selectAll(".sizeCircles")
    //for each bar associate the relevant data from the parent node, and the attr name to use the correct scale
    .data(d =>
      d.domain.map(domain => {
        return { data: domain, type: d.type };
      })
    );

  let sizeCirclesEnter = sizeCircles
    .enter()
    .append("g")
    .attr("class", "sizeCircles");

  sizeCirclesEnter.append("rect").attr("class", "sizeCircle");
  sizeCirclesEnter.append("text").attr("class", "sizeCircleLabel");

  sizeCircles.exit().remove();

  sizeCircles = sizeCirclesEnter.merge(sizeCircles);

  sizeCircles.attr("transform", (d, i) => {
    let radius = d.type === "node" ? 35 : d.type === "edgeType" ? 0 : 50;
    let yOffset = d.type === "edgeType" ? 50 : 0;
    return "translate(" + i * radius + "," + i * yOffset + ")";
  });

  let findCenter = function(i) {
    return circleScale.range()[1] / 2 - circleScale(i) / 2;
  };

  sizeCircles
    .select(".sizeCircle")
    .attr("height", (d, i) =>
      d.type === "edgeType"
        ? edgeScale(1)
        : d.type === "edgeWidth"
        ? edgeScale(i)
        : circleScale(i)
    )
    .attr("width", (d, i) => (d.type === "node" ? circleScale(i) : 30))
    .attr("y", (d, i) =>
      d.type === "node"
        ? findCenter(i) + 5
        : d.type === "edgeWidth"
        ? circleScale.range()[1] / 2 + 5
        : circleScale.range()[1] / 2 - 5
    )
    .attr("rx", (d, i) => (d.type === "node" ? circleScale(i) : 0))
    .attr("ry", (d, i) => (d.type === "node" ? circleScale(i) : 0))
    .style("fill", d => (d.type === "edgeType" ? edgeStrokeScale(d.data) : ""));

  sizeCircles
    .select(".sizeCircleLabel")
    .text(d => d.data)
    .attr(
      "transform",
      (d, i) =>
        "translate(" +
        (d.type === "node"
          ? circleScale(i) / 2
          : d.type === "edgeWidth"
          ? edgeScale(i)
          : 0) +
        "," +
        (d.type === "edgeType"
          ? circleScale.range()[1] / 2 + 20
          : circleScale.range()[1] + 25) +
        ")"
    )
    .style("text-anchor", "start")
    .style("font-weight", "bold");

  node_link_legend
    .select(".axisLabel")
    .style("text-anchor", "start")
    .style("font-weight", "bold")
    .text(d => d.label)
    // .text(d=>{return config.attributeScales.node[d.label].label})
    // .attr('x',circleScale(sizeAttributeValues[1]))
    .attr("y", 0);

  //center group with circles;
  upperGroupElement = d3
    .select(".upperGroup")
    .node()
    .getBBox();
  lowerGroupElement = d3
    .select(".lowerGroup")
    .node()
    .getBBox();

  // d3.select('.upperGroup').attr("transform","translate(" + (legend.width/2 - upperGroupElement.width/2) + "," +  (drawBars ? barHeight + 20 : 10) + ")");
  // d3.select('.lowerGroup').attr("transform","translate(" + (legend.width/2 - lowerGroupElement.width/2) + "," +  (legend.height-10) + ")");

  // let longerLabel = 15;
  // d3.selectAll('.squareLabel').each(function(){
  //   longerLabel = d3.max([longerLabel,d3.select(this).node().getBBox().width+15]);
  //   })
  // let lowerTranslate = !drawBars ? 0 : longerLabel ;

  // console.log(longerLabel)
  d3.select(".upperGroup").attr(
    "transform",
    "translate(15," + (drawBars ? barHeight + 20 : 30) + ")"
  );
  d3.select(".lowerGroup").attr(
    "transform",
    "translate(0," + (drawBars ? upperGroupElement.height + 30 : 100) + ")"
  );
}