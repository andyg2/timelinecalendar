
if (!window.console) {
  window.console = {
    log: function (msg) {
      return;
    }
  }
}

var TimelineCalendar = function (element) {
  var elem = element; // jQuery element

  var lineHeight = 20,
    header = null,
    pixelsPerDay = 0,
    isResizeAction = false, // detected resize action
    isMoveAction = false, // detected move action
    maxHeight = null, // holds max height, looks better - our cal grows
    gridRow = null;

  var start = new Date();
  start.setHours(0, 0, 0, 0);

  var options = {
    startDate: start,
    zoomLevel: 2,
    interval: 86400, // one day
    itemsMoveable: true, // can the user move the items
    itemsResizeable: true // ... or resize
  };

  var dragStartX = null,
    mouseDownItem = null,
    oldStartX = null;
  var factor = 0;

  var zoomLevels = new Array(7, 14, 28, 60);

  this.getZoomLevelOffset = function (level) {
    var firstTs = options.startDate.getTime() / 1000;
    var ts = zoomLevels[level] * 86400 + firstTs;
    return ts;
  }

  this.create = function () {
    var tl = this;
    elem.bind('mouseenter', function (event) {
      tl.entered = true;
    });
    elem.bind('mouseleave', function (event) {
      tl.entered = false;
    });

    $(window).bind('keyup', function (event) {
      if (tl.entered) {
        if (event.which == 39)
          tl.goFuture();
        else if (event.which == 37)
          tl.goPast();
        event.preventDefault();
      }
    });

    elem.bind('mousewheel', function (event, delta) {

      // var pf = event.screenX < elem.width() / 2 ? -1 : 1;
      // console.log(event);

      if (delta > 0)
        tl.goPast();
      else
        tl.goFuture();

      // if (delta > 0)
      //   tl.zoomIn();
      // else
      //   tl.zoomOut();
      return false;
    });

    this.draw();
  };

  this.drawJsonItems = function (target, items) {
    var zero = options.startDate.getTime() / 1000;
    for (var x = 0; x < items.length; x++) {
      var item = items[x];
      var d = new Date(item.start * 1000);
      var leftPos = (item.start - zero) * factor;
      var itemWidth = (item.end - item.start) * factor;
      var top = item.room ? item.room * 20 : 0;

      var d = $("<div>").data(item);
      d.addClass("item");
      if (item.cssclass)
        d.addClass(item.cssclass);
      d.css("left", leftPos + "px");
      d.css("width", itemWidth + "px");
      d.css("top", top + "px");

      var tl = this;

      // attach event listeners
      d.mouseover(function (event) {
        var pos = $(this).position();
        if (options.itemsResizeable &&
          event.pageX > (pos.left + $(this).width() - 20)) {
          $("body").addClass("resize");
        }
        else if (options.itemsMoveable)
          $("body").addClass("move");
      });

      d.mouseout(function () {
        $("body").removeClass("resize");
        $("body").removeClass("move");
      });

      d.mousedown(function (event) {
        mouseDownItem = $(this);
        // console.log(mouseDownItem);
        dragStartX = event.pageX;
        dragStartY = event.pageY;
        var pos = mouseDownItem.position();
        oldStartX = pos.left;
        oldStartY = pos.top;
        var mouseMoveFunction = null;

        if (options.itemsResizeable && event.pageX > (pos.left + mouseDownItem.width() - 10)) {
          // Handle resize action
          var oldWidth = mouseDownItem.width();
          isResizeAction = true;
          $("body").addClass("resize");
          mouseMoveFunction = function (event) {
            var dragDistance = event.pageX - dragStartX;
            var daysDragged = Math.round(dragDistance / pixelsPerDay);
            var newWidth = oldWidth + (daysDragged * pixelsPerDay);
            if (newWidth < pixelsPerDay) {
              newWidth = pixelsPerDay;
            }
            mouseDownItem.css("width", newWidth + "px");
          };
        }
        else if (options.itemsMoveable) {
          // Handle move action
          isMoveAction = true;
          $("body").addClass("move");
          mouseMoveFunction = function (event) {
            if (!mouseDownItem) {
              $(window).unbind(this);
              return;
            }

            var newLeft = oldStartX + (event.pageX - dragStartX);
            var newTop = oldStartY + (event.pageY - dragStartY);

            // Snap to increments of one day horizontally
            var newLeftInDays = Math.round(newLeft / pixelsPerDay);
            newLeft = newLeftInDays * pixelsPerDay;

            // Snap to increments of lineHeight (20) pixels vertically (room number)
            newTop = Math.round(newTop / lineHeight) * lineHeight;

            var room = newTop / lineHeight;
            mouseDownItem.css({ left: newLeft + "px", top: newTop + "px" });

            var thisData = {
              room: room,
              data: mouseDownItem.data("data"),
            }
            // console.log(thisData);
            mouseDownItem.html("R" + thisData.room + " " + thisData.data);
          };
        }

        var mvMouseUp = function (event) {
          $(window).unbind('mousemove', mouseMoveFunction);
          $(window).unbind('mouseup', mvMouseUp);

          var pos = mouseDownItem.position();
          var zero = options.startDate.getTime() / 1000;
          var start = zero + pos.left / factor;
          var room = pos.top / lineHeight;
          var end = start + mouseDownItem.width() / factor;
          // console.log(room);
          event.item = {
            node: mouseDownItem,
            room: parseInt(room),
            start: parseInt(start), // @todo compute the timestamp
            end: parseInt(end)
          };
          mouseDownItem = null;
          if (isMoveAction)
            tl.onItemMoved(event);
          else if (isResizeAction)
            tl.onItemResized(event);

          isMoveAction = isResizeAction = false;
          $("body").removeClass("resize");
          $("body").removeClass("move");
        }

        if (mouseMoveFunction) {
          $(window).bind("mouseup", mvMouseUp);
          $(window).bind("mousemove", mouseMoveFunction);
        }
        event.preventDefault();
      });

      this.setText(d, item);
      // d.html(item.room + " " + item.data);
      target.append(d);
    }

    // remind maxheight - this looks better after zooming
    if (elem.height() > maxHeight)
      maxHeight = elem.height();
    // gridRow.css("height",target.parent().height()+"px");
    // gridRow.css("display","table");
    return this;
  }

  this.setText = function (d, item) {
    d.html("R" + item.room + " " + item.data);
  }

  this.updateData = function (dataGrid) {
    // console.log("factor " + factor);
    var currentDate = options.startDate.getTime() / 1000;
    var zoomLevelDays = this.getZoomLevelOffset(options.zoomLevel);
    var tl = this;
    $.getJSON(
      "stores/api.php", {
      call: "get_events",
      start: currentDate,
      offset: zoomLevelDays,
    },
      function (data) {
        tl.drawJsonItems(dataGrid, data);
      });
  }

  this.onItemMoved = function (event) {
    // console.log("onItemMovedsss handler " + new Date(event.item.start * 1000) + " " + new Date(event.item.end * 1000));
  }

  this.onItemResized = function (event) {
    // console.log("onItemResized handler" + new Date(event.item.start * 1000) + " " + new Date(event.item.end * 1000));
  }

  this.draw = function () {
    var currentDate = options.startDate;
    elem.empty();

    var container = $("<div>").attr("class", "container");
    if (maxHeight) {
      container.css("min-height", maxHeight + "px");
    }

    header = $('<div>');
    header.addClass("header");

    var dataGrid = $("<div>");
    dataGrid.attr("class", "datagrid");
    var zoomLevelLimit = this.getZoomLevelOffset(options.zoomLevel);

    options.interval = 86400;

    factor = elem.width() / (zoomLevelLimit - (options.startDate.getTime() / 1000));
    pixelsPerDay = factor * options.interval;
    var odd = false;
    for (var x = (options.startDate.getTime() / 1000); x < zoomLevelLimit; x += options.interval) {
      odd ^= true;
      currentDate = new Date(x * 1000);
      var td = $("<div>");
      td.addClass("col");
      td.addClass((odd ? "odd" : "even"));
      td.addClass(currentDate.getDay());
      td.width(pixelsPerDay + "px");
      td.html(currentDate.toLocaleString('default', { month: 'short' }) + " " + currentDate.getDate());
      header.append(td);
    }

    container.append(header);
    container.append(gridRow);
    container.append(dataGrid);

    this.updateData(dataGrid);
    elem.append(container);

    if (this.onDraw)
      this.onDraw(options);
  }

  this.zoomIn = function (pf) {
    var currentLevel = options.zoomLevel;
    var levelIn = currentLevel - 1;
    if (zoomLevels[levelIn]) {
      options.zoomLevel = levelIn;
      this.draw();
    }
  }

  this.zoomOut = function () {
    var currentLevel = options.zoomLevel;
    var levelOut = currentLevel + 1;
    if (zoomLevels[levelOut]) {
      options.zoomLevel = levelOut;
      this.draw();
    }
  }

  this.goPast = function () {
    var tmp = (options.startDate.getTime() / 1000) - ((this.getZoomLevelOffset(options.zoomLevel) - (options.startDate.getTime() / 1000)) / 4);
    options.startDate = new Date(tmp * 1000);
    this.draw();
  }

  this.goFuture = function () {
    var tmp = (options.startDate.getTime() / 1000) + (this.getZoomLevelOffset(options.zoomLevel) - (options.startDate.getTime() / 1000)) / 4;
    options.startDate = new Date(tmp * 1000);
    this.draw();
  }

};
