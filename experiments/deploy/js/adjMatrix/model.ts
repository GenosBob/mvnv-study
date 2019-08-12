
class Model {
  /*
  The Model handels the loading, sorting, and ordering of the data.
   */
  private data: any;
  private matrix: any;
  private nodes: any;
  private edges: any;
  private order: any;
  private controller: any;
  private idMap : any;
  private orderType : string;
  public graph: any;
  private scalarMatrix: any;
  private datumID: string;
  private provenance: any;
  private app: any;

  constructor(controller: any) {
    this.controller = controller;
    this.datumID = controller.datumID;

    d3.json(controller.configuration.graphFiles[controller.configuration.loadedGraph]).then((data: any) => {
      this.graph = data;
      this.edges = data.links;

      //setPanelValuesFromFile(controller.configuration, data);
      this.matrix = [];
      this.scalarMatrix = [];
      /*
      d3.request('../../assets/adj-matrix/alphabeticalSort.svg').mimeType("image/svg+xml").get(function(error, svg) {
        console.log(svg,error)
        this.alphabeticalSortSvg = svg;
      })

      d3.request('../../assets/adj-matrix/categoricalSort.svg').mimeType("image/svg+xml").get(function(error, svg) {
        this.categoricalSortSvg = svg;
      })*/

      // = "M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.3 C407.7,333.7,404.7,330.7,401,330.7z M280,447.3c0,2-1.6,3.6-3.6,3.6h-52.8v-18.8h52.8c2,0,3.6,1.6,3.6,3.6V447.3z M309.2,417.9c0,2-1.6,3.6-3.6,3.6h-82v-18.8h82c2,0,3.6,1.6,3.6,3.6V417.9z M336.4,388.4c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h109.2c2,0,3.6,1.6,3.6,3.6V388.4z M367.3,359c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h140.1c2,0,3.6,1.6,3.6,3.6V359z";

      this.icons = {
        'quant': {
          'd':"M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.3C407.7,333.7,404.7,330.7,401,330.7z M280,447.3c0,2-1.6,3.6-3.6,3.6h-52.8v-18.8h52.8c2,0,3.6,1.6,3.6,3.6V447.3z M309.2,417.9c0,2-1.6,3.6-3.6,3.6h-82v-18.8h82c2,0,3.6,1.6,3.6,3.6V417.9z M336.4,388.4c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h109.2c2,0,3.6,1.6,3.6,3.6V388.4z M367.3,359c0,2-1.6,3.6-3.6,3.6H223.6v-18.8h140.1c2,0,3.6,1.6,3.6,3.6V359z"
        },
        'alphabetical':{
          'd':"M401.1,331.2h-189c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.8C407.7,334.2,404.8,331.2,401.1,331.2z M223.7,344.3H266c2,0,3.6,1.6,3.6,3.6v11.6c0,2-1.6,3.6-3.6,3.6h-42.3V344.3z M223.7,373H300c2,0,3.6,1.6,3.6,3.6v11.6c0,2-1.6,3.6-3.6,3.6h-76.3V373.7z M263.6,447.8c0,2-1.6,3.6-3.6,3.6h-36.4v-18.8H260c2,0,3.6,1.6,3.6,3.6V447.8z M321.5,418.4c0,2-1.6,3.6-3.6,3.6h-94.2v-18.8h94.2c2,0,3.6,1.6,3.6,3.6V418.4z M392.6,449.5h-34.3V442l22.6-27h-21.7v-8.8h33.2v7.5l-21.5,27h21.7V449.5z M381,394.7l-3.7,6.4l-3.7-6.4h2.7v-14.6h2v14.6H381z M387,380l-3.4-9.7h-13.5l-3.3,9.7h-10.2l15.8-43.3h9l15.8,43.3H387z M371.8,363.4H382l-5.1-15.3L371.8,363.4z"
        },
        'categorical':{
          'd':"M401,330.7H212c-3.7,0-6.6,3-6.6,6.6v116.4c0,3.7,3,6.6,6.6,6.6h189c3.7,0,6.6-3,6.6-6.6V337.4C407.7,333.7,404.7,330.7,401,330.7z M272.9,374.3h-52.4v-17.1h52.4V374.3z M272.9,354h-52.4v-17h52.4V354z M332.1,414.9h-52.4v-17h52.4V414.9z M332.1,394.6h-52.4v-17h52.4V394.6z M394.8,456.5h-52.4v-17h52.4V456.5z M394.8,434.9h-52.4v-17h52.4V434.9z"
        }

      }
      this.nodes = data.nodes
      this.populateSearchBox();
      this.idMap = {};

      // sorts adjacency matrix, if a cluster method, sort by shortname, then cluster later
      let clusterFlag = false;
      if (this.controller.configuration.adjMatrix.sortKey in ['clusterBary', 'clusterLeaf', 'clusterSpectral']) {
        this.orderType = 'shortName';//this.controller.configuration.adjMatrix.sortKey;
        clusterFlag = true;
      } else {
        this.orderType = this.controller.configuration.adjMatrix.sortKey;
      }

      this.order = this.changeOrder(this.orderType);

      // sorts quantitative by descending value, sorts qualitative by alphabetical
      if (!this.isQuant(this.orderType)) {
        this.nodes = this.nodes.sort((a, b) => a[this.orderType].localeCompare(b[this.orderType]));
      } else {
        this.nodes = this.nodes.sort((a, b) => { return b[this.orderType] - a[this.orderType]; });
      }

      this.nodes.forEach((node, index) => {
        node.index = index;
        this.idMap[node.id] = index;
      })

      this.controller = controller;

      this.processData();

      if (clusterFlag) {
        this.orderType = this.controller.configuration.adjMatrix.sortKey;
        this.order = this.changeOrder(this.orderType);
      }

      this.controller.loadData(this.nodes, this.edges, this.matrix);
    })
  }

  /**
   * Determines if the attribute is quantitative
   * @param  attr [string that corresponds to attribute type]
   * @return      [description]
   */
  isQuant(attr) {
    // if not in list
    if (!Object.keys(this.controller.configuration.attributeScales.node).includes(attr)) {
      return false;
    } else if (this.controller.configuration.attributeScales.node[attr].range === undefined) {
      return true;
    } else {
      return false;
    }
  }


  populateSearchBox() {
    /*
    d3.select("#search-input").attr("list", "characters");
    let inputParent = d3.select("#search-input").node().parentNode;

    let datalist = d3
    .select(inputParent).selectAll('#characters').data([0]);

    let enterSelection = datalist.enter()
    .append("datalist")
    .attr("id", "characters");

    datalist.exit().remove();

    datalist= enterSelection.merge(datalist);

    let options = datalist.selectAll("option").data(this.nodes);

    let optionsEnter = options.enter().append("option");
    options.exit().remove();

    options = optionsEnter.merge(options);
    options.attr("value", d => d.shortName);
    options.attr("id", d => d.id);

    d3.select("#search-input").on("change", (d,i,nodes) => {
      let selectedOption = d3.select(nodes[i]).property("value");
      console.log(this.controller.view.search(selectedOption))
    });
*/
  }

  /**
   * returns an object containing the current provenance state.
   * @return [the provenance state]
   */
  getApplicationState() {
    return {
      currentState: () => this.provenance.graph().current.state;
    };
  }

  /**
   * Initializes the provenance library and sets observers.
   * @return [none]
   */
  setUpProvenance() {
    const initialState = {
      workerID: workerID, // workerID is a global variable
      taskID: this.controller.tasks[this.controller.taskNum],
      nodes: '',//array of nodes that keep track of their position, whether they were softSelect or hardSelected;
      search: '', //field to store the id of a searched node;
      startTime: Date.now(), //time this provenance graph was created and the task initialized;
      endTime: '', // time the submit button was pressed and the task ended;
      time: Date.now(), //timestamp for the current state of the graph;
      count: 0,
      clicked: [],
      sortKey: this.controller.configuration.adjMatrix.sortKey,
      selections: {
        answerBox: {},
        attrRow: {},
        rowLabel: {},
        colLabel: {},
        neighborSelect: {},
        cellcol: {},
        cellrow: {},
        search: {}
      }
    };

    const provenance = ProvenanceLibrary.initProvenance(initialState);

    this.provenance = provenance;

    const app = this.getApplicationState();
    this.app = app;


    // creates the document with the name and worker ID
    //pushProvenance(app.currentState());

    let columnElements = ['topoCol'];
    let rowElements = ['topoRow', 'attrRow']

    let elementNamesFromSelection = {
      cellcol: rowElements.concat(columnElements),
      colLabel: rowElements.concat(columnElements).concat(['colLabel']),
      rowLabel: rowElements.concat(columnElements).concat(['rowLabel']),
      attrRow: rowElements.concat(['rowLabel']),
      cellrow: rowElements.concat(columnElements),
      neighborSelect: rowElements,
      answerBox: rowElements.concat(columnElements),
      search: rowElements.concat(columnElements)
    }

    function classAllHighlights(state) {

      let clickedElements = new Set();
      let answerElements = new Set();
      let neighborElements = new Set();

      // go through each interacted element, and determine which rows/columns should
      // be highlighted due to it's interaction
      for (let selectionType in state.selections) {
        for (let index in elementNamesFromSelection[selectionType]) {
          let selectionElement = elementNamesFromSelection[selectionType][index];

          for (let node in state.selections[selectionType]) {
            if (selectionType == 'answerBox') {
              answerElements.add('#' + selectionElement + node)
            } else if (selectionType == 'neighborSelect') {
              neighborElements.add('#' + selectionElement + node)
            } else {

              // if both in attrRow and rowLabel, don't highlight element
              if (selectionType == 'attrRow' || selectionType == 'rowLabel') {
                if (node in state.selections['attrRow'] && node in state.selections['rowLabel']) continue;
              }

              clickedElements.add('#' + selectionElement + node)
            }
          }

        }
      }

      let clickedSelectorQuery = Array.from(clickedElements).join(',')
      let answerSelectorQuery = Array.from(answerElements).join(',')
      let neighborSelectQuery = Array.from(neighborElements).join(',')

      clickedSelectorQuery != [] ? d3.selectAll(clickedSelectorQuery).classed('clicked', true) : null;
      answerSelectorQuery != [] ? d3.selectAll(answerSelectorQuery).classed('answer', true) : null;
      neighborSelectQuery != [] ? d3.selectAll(neighborSelectQuery).classed('neighbor', true) : null;

      return;
    }

    function setUpObservers() {
      let updateHighlights = (state) => {
        d3.selectAll('.clicked').classed('clicked', false);
        d3.selectAll('.answer').classed('answer', false);
        d3.selectAll('.neighbor').classed('neighbor', false);

        classAllHighlights(state);
      };

      let updateCellClicks = (state) => {
        let cellNames = [];
        Object.keys(state.selections.cellcol).map(key => {
          let names = state.selections.cellcol[key];
          names.map(name => {
            let cellsNames = splitCellNames(name);
            cellNames = cellNames.concat(cellsNames)
          })

          //names.map(name=>{
          //})
        })
        let cellSelectorQuery = '#' + cellNames.join(',#')
        // if no cells selected, return
        d3.selectAll('.clickedCell').classed('clickedCell', false);
        if (cellSelectorQuery == '#') return;
        d3.selectAll(cellSelectorQuery).selectAll('.baseCell').classed('clickedCell', true)

      }

      let updateAnswerBox = (state) => {
        window.controller.configuration.adjMatrix['toggle'] ? window.controller.view.updateAnswerToggles(state) : window.controller.view.updateCheckBox(state);
        //window.controller.view.updateAnswerToggles(state)
        let answer = [];
        for (let i = 0; i < window.controller.model.nodes.length; i++) {
          if (window.controller.model.nodes[i][this.controller.view.datumID] in state.selections.answerBox) {
            answer.push(window.controller.model.nodes[i]);
          }
        }
        updateAnswer(answer);


      }
      provenance.addObserver("selections.attrRow", updateHighlights)
      provenance.addObserver("selections.rowLabel", updateHighlights)
      provenance.addObserver("selections.colLabel", updateHighlights)
      provenance.addObserver("selections.cellcol", updateHighlights)
      provenance.addObserver("selections.cellrow", updateHighlights)
      provenance.addObserver("selections.neighborSelect", updateHighlights)
      provenance.addObserver("selections.cellcol", updateCellClicks)

      provenance.addObserver("selections.search", updateHighlights)
      provenance.addObserver("selections.answerBox", updateHighlights)
      provenance.addObserver("selections.answerBox", updateAnswerBox)

    }
    setUpObservers();


    return [app, provenance];


  }




  reload() {
    this.controller.loadData(this.nodes, this.edges, this.matrix);
  }

  /**
   *   Determines the order of the current nodes
   * @param  type A string corresponding to the attribute screen_name to sort by.
   * @return      A numerical range in corrected order.
   */
  changeOrder(type: string) {
    let order;
    this.orderType = type;
    this.controller.configuration.adjMatrix.sortKey = type;
    if (type == "clusterSpectral" || type == "clusterBary" || type == "clusterLeaf") {

      var graph = reorder.graph()
        .nodes(this.nodes)
        .links(this.edges)
        .init();

      if (type == "clusterBary") {
        var barycenter = reorder.barycenter_order(graph);
        order = reorder.adjacent_exchange(graph, barycenter[0], barycenter[1])[1];
      } else if (type == "clusterSpectral") {
        order = reorder.spectral_order(graph);
      } else if (type == "clusterLeaf") {
        let mat = reorder.graph2mat(graph);
        order = reorder.optimal_leaf_order()(mat);
      }

      //

      //order = reorder.optimal_leaf_order()(this.scalarMatrix);
    }
    else if (this.orderType == 'edges') {
      order = d3.range(this.nodes.length).sort((a, b) => this.nodes[b][type].length - this.nodes[a][type].length);
    }
    else if (!this.isQuant(this.orderType)) {// == "screen_name" || this.orderType == "name") {
      order = d3.range(this.nodes.length).sort((a, b) => this.nodes[a][type].localeCompare(this.nodes[b][type]));
    } else {
      order = d3.range(this.nodes.length).sort((a, b) => { return this.nodes[b][type] - this.nodes[a][type]; });
    }

    this.order = order;
    return order;
  }
  private maxTracker: any;
  /**
   * [processData description]
   * @return [description]
   */
  processData() {
    // generate a hashmap of id's?
    // Set up node data
    this.nodes.forEach((rowNode, i) => {
      rowNode.count = 0;

      /* Numeric Conversion */
      rowNode.followers_count = +rowNode.followers_count;
      rowNode.query_tweet_count = +rowNode.query_tweet_count;
      rowNode.friends_count = +rowNode.friends_count;
      rowNode.statuses_count = +rowNode.statuses_count;
      rowNode.favourites_count = +rowNode.favourites_count;
      rowNode.count_followers_in_query = +rowNode.count_followers_in_query;
      //rowNode.id = +rowNode.id;
      rowNode.y = i;


      /* matrix used for edge attributes, otherwise should we hide */
      this.matrix[i] = this.nodes.map((colNode) => { return { cellName: 'cell' + rowNode[this.datumID] + '_' + colNode[this.datumID], correspondingCell: 'cell' + colNode[this.datumID] + '_' + rowNode[this.datumID], rowid: rowNode[this.datumID], colid: colNode[this.datumID], x: colNode.index, y: rowNode.index, count: 0, z: 0, interacted: 0, retweet: 0, mentions: 0 }; });
      this.scalarMatrix[i] = this.nodes.map(function(colNode) { return 0; });

    });
    function checkEdge(edge) {
      if (typeof edge.source !== "number") return false
      if (typeof edge.target !== "number") return false;
      return true
    }
    this.edges = this.edges.filter(checkEdge);
    this.maxTracker = { 'reply': 0, 'retweet': 0, 'mentions': 0 }
    // Convert links to matrix; count character occurrences.
    this.edges.forEach((link) => {


      let addValue = 1;
      this.matrix[this.idMap[link.source]][this.idMap[link.target]][link.type] += link.count;
      //
      this.scalarMatrix[this.idMap[link.source]][this.idMap[link.target]] += link.count;


      /* could be used for varying edge types */
      //this.maxTracker = { 'reply': 3, 'retweet': 3, 'mentions': 2 }
      this.matrix[this.idMap[link.source]][this.idMap[link.target]].z += addValue;

      this.matrix[this.idMap[link.source]][this.idMap[link.target]].count += 1;
      // if not directed, increment the other values
      if (!this.controller.configuration.isDirected) {
        this.matrix[this.idMap[link.target]][this.idMap[link.source]].z += addValue;
        this.matrix[this.idMap[link.target]][this.idMap[link.source]][link.type] += link.count;
        this.scalarMatrix[this.idMap[link.source]][this.idMap[link.target]] += link.count;

      }
      link.source = this.idMap[link.source];
      link.target = this.idMap[link.target];
    });
  }

  getOrder() {
    return this.order;
  }

  /**
   * Returns the node data.
   * @return Node data in JSON Array
   */
  getNodes() {
    return this.nodes;
  }

  /**
   * Returns the edge data.
   * @return Edge data in JSON Array
   */
  getEdges() {
    return this.edges;
  }

}