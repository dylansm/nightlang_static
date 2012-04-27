$(document).ready(function() {
  // cookie for ui
  if($.cookie("nl-util-open")) { $('.util').addClass("open"); }
  if($.cookie("nl-font-type")) {
    $('div.c').addClass("sans");
    $('.font-type').removeClass("sans");
    $('.font-type').addClass("font-type");
  }
  Nav.init();
  $('div.c').hide();
  Justifier.init();
  if ($('html').hasClass("wf-fail")) {
    Justifier.go();
  };
  UI.init();
});

var NLUtil = {
  sizes: ["sm", "med", "lg"],
  sizePointer: 0,
  changeFontSize: function() {
    $('link').each(function() {
      if($(this).attr("title") == NLUtil.sizes[NLUtil.sizePointer]) {
        $(this).removeAttr("rel").attr("rel", "stylesheet");
        $(this).attr("disabled", false);
      }
      else if($(this).attr("title")) {
        $(this).removeAttr("rel").attr("rel", "alternate stylesheet");
        $(this).attr("disabled", true);
      }
    });
  }
};

var Justifier = {
  go: function(fail) {
    var c = $('div.c');
    c.show();
    Justifier.calculateSpaceWidths();
    c.hide();
    c.fadeIn(250);
  },
  // wrap each line in <span class="p-wrap">
  init: function() {
    // used to flag whether <em> continues to next line (DOM screwed by </span> at end of line)
    var wrappingEm;
    var justifiablePs = this.getJustifiableParagraphs();
    $(justifiablePs).each(function(index) {
      var p = $(this).clone();
      var arrBr = $(p).html().split('<br>');
      // var lines_to_justify = arrBr.length - 1;
      var lines_to_justify = arrBr.length;
      // if last line of paragraph, justify it if continuing to next page and not a footnote
      for (var i = 0; i < lines_to_justify; i++) {
        if (wrappingEm) {
          if (i == lines_to_justify - 1 && $(this).html().indexOf("<span></span>") == -1) {
            arrBr[i] = '<em>' + arrBr[i];
          } else {
            arrBr[i] = '<span class="line-wrap"><em>' + arrBr[i];
          };
          wrappingEm = false;
        } else {
          if (i < lines_to_justify - 1 || $(this).html().indexOf("<span></span>") > -1) {
            arrBr[i] = '<span class="line-wrap">' + arrBr[i];
          };
        }
        arrBr[i] = arrBr[i].replace(/\s$/, '');
        arrBr[i] = arrBr[i].replace(/\n/g, '');
        // deal with wrapping <em>
        var lastEmOpen  = arrBr[i].lastIndexOf("<em>");
        var lastEmClose = arrBr[i].lastIndexOf("</em>");
        if (lastEmClose < lastEmOpen) {
          arrBr[i] += '</em>';
          wrappingEm = true;
        }
        arrBr[i] += '</span>';
      }
      var newP = arrBr.join("<br />");
      p.html(newP);
      // replace original <p> with <span> wrapped <p>
      $(this).replaceWith(p);
    });
  },
  // calculate widths needed for each space on each line
  calculateSpaceWidths: function() {
    var lineWraps = $("span.line-wrap");
    lineWraps.each(function() {
      var diff = Justifier.calculateDiff($(this));
      if ($(this).text().indexOf(' ') > -1) {
        var m = $(this).text().match(/\s/g);
        var lineWithSpans = Justifier.getSemanticSpaces($(this).html());
        var r = diff % m.length;
        var px = Math.floor(diff / m.length);
        var arrJSpans = lineWithSpans.split('<span class="justifier">');
        for (var i=0; i < arrJSpans.length; i++) {
          var adjPx = px;
          if (r && i < r) adjPx += 1;
          if (i < arrJSpans.length - 1) {
            arrJSpans[i] += '<span class="justifier" style="width: ' + adjPx + 'px;">';
          } else {
            arrJSpans[i] = arrJSpans[i].replace(/^<\/span>\s/, '</span>');
          };
        };
        var html = arrJSpans.join('');
        $(this).html(html);
      } else {
        $(this).addClass("no-space");
      };
    });
    // fix Firefox
    if (NLBrowser.name == "firefox") {
      $('div.c')[0].style.width = Justifier.container_width + 1 + "px";
    };

    Justifier.letterSpace();
  },
  // returns array of paragraphs to justify
  getJustifiableParagraphs: function() {
    // elements not justified:
    var arr_no_just = [".util p", "p.page-num", "div.l p", "div.r p", "p.c", "p.stanza", "p.chorus"];
    var i = arr_no_just.length;
    var collection = $('div.c p');
    while (i--) {
      collection = $(collection).not(arr_no_just[i]);
    };
    return $(collection);
  },
  // get only spaces not part of tags
  getSemanticSpaces: function(h) {
    var tags_with_spaces = h.match(/<(.+\s+[^<>]+)>/g);
    var spanInsert = '<span class="justifier"></span>';
    var tag_to_return;
    if (tags_with_spaces) {
      // this section deals with counting up tags with spaces
      // to properly locate indices
      var indices = [];
      var spansToLeft = [];
      var h_cleaned = '';
      var i = tags_with_spaces.length;
      while(i--) {
        indices.push(h.indexOf(tags_with_spaces[i]));
        var spanCount = h.substr(0, indices[i]).match(/\s/g);
        spanCount = spanCount ? spanCount.length : 0;
        spansToLeft.push(spanCount);
        h_cleaned = h.split(tags_with_spaces[i]).join('');
      }
      var m = h_cleaned.match(/(.[^\s]+)\s/g);
      var t = insertSpans(m);
      t += h_cleaned.substr(h_cleaned.lastIndexOf(" ") + 1);
      var indexOffset = (spansToLeft[0] * spanInsert.length) + indices[0];
      // if line ends with tag with spaces
      if (h.match(/<\w+\s[^>]+>\w+<\/\w+>(<span><\/span>)?$/)) {
        indexOffset += 1;
      }
      var firstPart = t.substr(0, indexOffset);
      firstPart += tags_with_spaces[0];
      var secondPart = t.substr(indexOffset);
      t = firstPart + secondPart;
      tag_to_return = t;
    } else {
      tag_to_return = insertSpans(h.match(/([^\s]+)\s/g)) + h.substr(h.lastIndexOf(" "));
    }
    function insertSpans(arr) {
      for (var i=0; i < arr.length; i++) {
        arr[i] += spanInsert;
      };
      return arr.join('');
    }
    return tag_to_return;
  },
  // calculate line offset width v. container width
  calculateDiff: function(line) {
    // get offset left of each line (to account for indentation, etc.)
    // then subtract that from it's container
    var lineLeft, diff;
    if ($(line).closest('div.wide').length) {
      Justifier.container_width = $('div.wide').width();
      diff = $('div.wide').width() - $(line).width();
    }
    else if ($(line).closest('div.footnotes').length) {
      Justifier.container_width = $('div.c').width();
      lineLeft = $(line).offset().left - $("div.footnotes").offset().left;
      diff = $('div.footnotes').width() - ($(line).width() + lineLeft);
    } else {
      Justifier.container_width = $('div.c').width();
      lineLeft = $(line).offset().left - $("div.c").offset().left;
      diff = $('div.c').width() - ($(line).width() + lineLeft);
    }
    var em_dashes = $(line).html().match(/<span class="em">/);
    var num_em_dashes = (em_dashes) ? em_dashes.length : 0;
    // return diff - (num_em_dashes * 4); // watch this
    return diff;
  },
  // to reset
  resize: function() {
    $('span.justifier').remove();
    Justifier.calculateSpaceWidths();
  },

  letterSpace: function() {
    var arrToSpace = $('.no-space');
    if (arrToSpace.length < 1) return;
    var container_width = $('div.c').width();
    var completed = new Array(arrToSpace.length);
    var countdown = arrToSpace.length;
    var closing_in = new Array(arrToSpace.length);

    var counter = 3; // corresponds to safe minimum CSS of .03em for sans -- now need 4 for serif
    Justifier.space_interval = setInterval(function() {
      counter++;
      arrToSpace.each(function(index) {
        var em_space = (closing_in[index]) ? counter * 0.5 / 100 : counter / 100;
        if(!completed[index]) {
          arrToSpace[index].style.letterSpacing = em_space + "em";
          if ($(arrToSpace[index]).width() > container_width && !closing_in[index]) {
            em_space = parseInt(em_space * 100 - 1, 10) / 100;
            closing_in[index] = true;
          }
          else if ($(arrToSpace[index]).width() > container_width) {
            em_space = (parseInt((em_space * 100 - 0.5), 10) / 100);
            completed[index] = true;
            countdown--;
            if (!countdown) {
              clearInterval(Justifier.space_interval);
            }
          }
          arrToSpace[index].style.letterSpacing = em_space + "em";
        }
      });
    }, 5);
  }
};

var UI = {
  init: function() {
    $('.util').click(function() {
      if ($(this).hasClass("open")) {
        $(this).animate({ left: - $(this).width() - 10}, 200);
        $.cookie("nl-util-open", null, {path: '/'});
        $(this).removeClass("open");
      } else {
        $(this).animate({ left: -9}, 200);
        $.cookie("nl-util-open", true, {path: '/'});
        $(this).addClass("open");
      }
    });
    // click handler for font resize
    $('.util span[data-nl-font-size]').click(function(e) {
      e.stopPropagation();
      NLUtil.sizePointer += parseInt($(this).attr("data-nl-font-size"), 10);
      if (NLUtil.sizePointer < 0) { NLUtil.sizePointer = 0; }
      var maxIndex = NLUtil.sizes.length - 1;
      if (NLUtil.sizePointer > maxIndex) { NLUtil.sizePointer = maxIndex; }
      NLUtil.changeFontSize();
      Justifier.resize();
      $.cookie("nl-font-size", NLUtil.sizePointer, {expires: 365, path: '/'});
    });
    // click handler for font type
    $('.util span[data-nl-font-type]').click(function(e) {
      e.stopPropagation();
      if ($(this).hasClass("sans")) {
        $(this).removeClass("sans");
        $(this).addClass("font-type");
        $('div.c').addClass("sans");
        $.cookie("nl-font-type", "sans", {expires: 365, path: '/'});
        Justifier.resize();
      } else {
        $(this).addClass("sans");
        $('div.c').removeClass("sans");
        $.cookie("nl-font-type", null, {expires: 365, path: '/'});
        Justifier.resize();
      }
    });
    // close util on content click
    $('div.c .content').click(function() {
      if ($.cookie("nl-util-open")) {
        $('.util').trigger("click");
      };
    });
    // handle resize (ncluding cmd-+/-)
    // BROKEN — gets called everytime
    // $(window).resize(function() {
    //   trace("what?");
    //   setTimeout(Justifier.resize, 80);
    // });

    // iOS page turning
    // $(window).gesturechange(function() {
    //   alert('g');
    // });
  }
};




var Nav = {
  init: function() {
    // position left/prev page navigation
    var prev = $('.prev')[0];
    var next = $('.next')[0];
    var adj = 10;

    if ($('div.l').length) {
      prev.style.left = getNavPrevL() + "px";
      if ($('div.wide').length) {
        prev.style.width = $('div.wide').offset().left - adj + "px";
      } else {
        prev.style.width = $('div.l').offset().left + $('div.l').width() + adj + "px";
      };
    } else {
      var navPrevL = getNavPrevL();
      prev.style.left = navPrevL + "px";
      if ($('div.wide').length) {
        prev.style.width = -navPrevL - ($('div.wide').width() - $('div.c').width() >> 1) - 10 + "px";
      } else {
        prev.style.width = -navPrevL - 10 + "px";
      };

    }
    // position right/next page navigation
    var navNextW;
    if ($('div.r').length) {
      navNextW = $(document).width() - ($('div.r').offset().left);
      next.style.width = navNextW + "px";
      var gap = $('div.r').offset().left - ($('div.c').offset().left + $('div.c').width());
      var navNextL = $('div.r').offset().left - navNextW - gap - adj;
      next.style.left = navNextL + "px";
    } else {
      if ($('div.wide').length) {
        navNextW = $(document).width() - ($('div.wide').offset().left + $('div.wide').width());
        next.style.width = navNextW - adj + "px";
        next.style.right = -navNextW - ($('div.wide').width() - $('div.c').width() >> 1) + "px";
      } else {
        navNextW = $(document).width() - ($('div.c').offset().left + $('div.c').width());
        next.style.width = navNextW + "px";
        next.style.right = -navNextW - adj + "px";
      };

    }

    function getNavPrevL() {
      return -$('div.c').offset().left;
      // if ($('div.wide').length) {
      //   return -$('div.wide').offset().left;
      // } else {
      //   return -$('div.c').offset().left;
      // };
    };
  }
};

var NLBrowser = {
  name: "",
  ua: navigator.userAgent.toLowerCase(),
  init: function() {
    if (NLBrowser.ua.indexOf("gecko") > -1 && NLBrowser.ua.indexOf("chrome") == -1) {
      NLBrowser.name = "firefox";
    };
    return NLBrowser.name;
  }
};

// animated scroll to links on same page
// function filterPath(string) {
// return string
//   .replace(/^\//,'')
//   .replace(/(index|default).[a-zA-Z]{3,4}$/,'')
//   .replace(/\/$/,'');
// }
// var locationPath = filterPath(location.pathname);
// var scrollElem = scrollableElement('html', 'body');
//
// $('a[href*=#]').each(function() {
//   var thisPath = filterPath(this.pathname) || locationPath;
//   if (locationPath == thisPath
//   && (location.hostname == this.hostname || !this.hostname)
//   && this.hash.replace(/#/,'') ) {
//     var $target = $(this.hash), target = this.hash;
//     // var $target = (this.parentNode.parentNode.tagName == "LI") ?
//     //   $(this.parentNode.parentNode) : $(this);
//     // trace($target);
//     var target = this.hash;
//     if (target) {
//       var targetOffset = $target.offset().top;
//       $(this).click(function(event) {
//         event.preventDefault();
//         $(scrollElem).animate({scrollTop: targetOffset}, 400, function() {
//           location.hash = target;
//         });
//       });
//     }
//   }
// });
//
// // use the first element that is "scrollable"
// function scrollableElement(els) {
//   for (var i = 0, argLength = arguments.length; i <argLength; i++) {
//     var el = arguments[i],
//         $scrollElement = $(el);
//     if ($scrollElement.scrollTop() > 0) {
//       return el;
//     } else {
//       $scrollElement.scrollTop(1);
//       var isScrollable = $scrollElement.scrollTop() > 0;
//       $scrollElement.scrollTop(0);
//       if (isScrollable) {
//         return el;
//       }
//     }
//   }
//   return [];
// }

/**
 * JavaScript code to detect available availability of a
 * particular font in a browser using JavaScript and CSS.
 *
 * Author : Lalit Patel
 * Website: http://www.lalit.org/lab/jsoncookies
 * License: Creative Commons Attribution-ShareAlike 2.5
 *          http://creativecommons.org/licenses/by-sa/2.5/
 */
var Detector = function() {
  var font, fonts;
  var h = document.getElementsByTagName("BODY")[0];
  var d = document.createElement("DIV");
  var s = document.createElement("SPAN");
  d.appendChild(s);
  d.style.fontFamily = "sans";            //font for the parent element DIV.
  s.style.fontFamily = "sans";            //serif font used as a comparator.
  s.style.fontSize   = "72px";            //we test using 72px font size, we may use any size. I guess larger the better.
  s.innerHTML        = "mmmmmmmmmmlil";   //we use m or w because these two characters take up the maximum width. And we use a L so that the same matching fonts can get separated
  h.appendChild(d);
  var defaultWidth   = s.offsetWidth;     //now we have the defaultWidth
  var defaultHeight  = s.offsetHeight;    //and the defaultHeight, we compare other fonts with these.
  h.removeChild(d);
  function debug(font) {
    h.appendChild(d);
    var f = [];
    f[0] = s.style.fontFamily = font;  // Name of the font
    f[1] = s.offsetWidth;        // Width
    f[2] = s.offsetHeight;        // Height
    h.removeChild(d);
    font = font.toLowerCase();
    if (font == "serif") {
      f[3] = true;
    } else {
      f[3] = (f[1] != defaultWidth || f[2] != defaultHeight);
    }
    return f;
  };
  function test(font){
    var f = debug(font);
    return f[3];
  };
  //this.detailedTest = debug;
  this.test = test;
};

function wfFail(e) {
  $('html').addClass("wf-fail");
}

function wfLoading() {
  // setTimeout(Justifier.calculateSpaceWidths, 120);
  // $('div.c').hide();
  // $('div.c').fadeIn(500);
}

function wfLoaded() {
  window.setTimeout(function() {
    var detector = new Detector();
    var fonts;
    if (document.defaultView.getComputedStyle($('div.c p')[0],null)["font-family"]) {
      fonts = document.defaultView.getComputedStyle($('div.c p')[0],null)["font-family"];
    }
    else if(document.defaultView.getComputedStyle($('div.c p')[0],null)["fontFamily"]) {
      fonts = document.defaultView.getComputedStyle($('div.c p')[0],null)["fontFamily"];
    };
    fonts = fonts.replace(/"/g, "");
    detector.fonts = fonts.split(",");
    // alert(detector.testFonts());
  }, 10);
  Justifier.go();
  //window.setTimeout(function(){ if (detector.test(fontName)) { detector.font = fontName; /*trace(detector.font);*/ } }, 10);
};

// computed style helper
function getStyle(el, styleProp) {
  if (el.currentStyle) {
    return el.currentStyle[styleProp];
  }
  else if (window.getComputedStyle) {
    return document.defaultView.getComputedStyle(el,null).getPropertyValue(styleProp);
  }
};

// cookie for font size
if($.cookie("nl-font-size") && $.cookie("nl-font-size") != "0") {
  NLUtil.sizePointer = parseInt($.cookie("nl-font-size"), 10);
  NLUtil.changeFontSize();
};

NLBrowser.init();


// trace
function trace(a){if(typeof console!="undefined"){if(typeof console.debug!="undefined")console.debug(a);else typeof console.log!="undefined"&&console.log(a);}};
window.debugMode = Boolean(document.location.hash.match(/debug/));