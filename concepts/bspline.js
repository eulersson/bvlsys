window.onload = function() {

  var c, ctx;

  var segment = {
    points: [
      {x: 1000, y: 100},
      {x: 500, y: 200},
      {x: 900, y: 300},
      {x: 500, y: 500}
    ]
  }

  function draw() {
    ctx.clearRect(0, 0, c.width, c.height);
    var i = 5;
    segment.points.forEach(function(point) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, i, 0, 2 * Math.PI);
      ctx.fillStyle = "#ff0000";
      ctx.fill();
      ctx.closePath();
      i += 5;
    });
    draw_curve(segment);
  }

  function init() {
    c = document.getElementById("canvas");
    ctx = c.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    c.width = window.innerWidth;
    c.height = window.innerHeight;

    draw();
  }

  function N(i, j, t) {
    if (j === 0) {
      if ((knots[i] <= t && t < knots[i+1]) && knots[i] < knots[i+1]) {
        return 1.0;
      } else {
        return 0.0;
      }
    } else {
      var firstHalf = (t-knots[i])/(knots[i+j]-knots[i]) * N(i, j-1, t);
      var secondHalf = ((knots[i+j+1]-t)/(knots[i+j+1]-knots[i+1])) * N(i+1,j-1,t);
      var result = firstHalf + secondHalf;
      return result;
    }
  }

  var knots;
  function draw_curve(segment) {
    var n = segment.points.length - 1;
    var p = 2;

    var m = n + p + 1;

    knots = [];
    var i = 0;
    knots = [0.01, 0.02, 0.03, 0.5, 0.98, 0.99, 1.00];


    console.dir(knots);

    for (t = knots[p]; t < knots[segment.points.length]; t += 0.0005) {
      var result_x = 0;
      var result_y = 0;

      for (i = 0; i < segment.points.length; i += 1) {
        //console.log(`----------- Evaluating N${i}${p}`);
        var ev = N(i, p, t);
        //console.log(`EV ${ev}`);
        var x = segment.points[i].x * ev;
        var y = segment.points[i].y * ev;

        // console.log("______________");
        // console.log(ev);
        // console.log(x);
        // console.log(y);
        // console.log(segment.points[s].x);
        // console.log(segment.points[s].y);
        // console.log("______________");

        result_x += x;
        result_y += y;
      }
      ctx.beginPath();
      ctx.arc(result_x, result_y, 5 * t, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.closePath();

    }


  }

  function popImage() {
    var win = window.open("", "Canvas Image");
    var src = this.canvas.toDataURL("image/png");
    win.document.write("<img src='" + src 
      + "' width='" + this.width 
      + "' height='" + this.height + "'/>");
  }

  init();
}