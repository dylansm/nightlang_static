#!/usr/bin/env ruby -wKU

class BookFormatter

  def initialize(book)
    text = IO.read(book)
    @episode = 1
    @special = ""
    @episodes, @pages = [], []
    @parts = text.split(/\/\%Part\%\//)
    @parts.each { |part|
      @pages.concat(part.split(/\<\%page-\d+\%\>/))
    }
    # @episodes = text.split(/\{\%Episode\%\}/)
    # @pages = text.split(/\<\%page\%\>/)
  end

  def xhtml_transform
    @pages.each_with_index { |page, i|
      page_num = i + 1
      if page.index("<%blank%>")
        next
      end
      padding, padding_string = 4 - page_num.to_s.length, ""
      padding.times { padding_string << "0" }
      file_name = "f_#{padding_string + page_num.to_s}"
      File.open("HTML/#{file_name}.txt", 'w') {|f|
        # f.write("format: snippet\n")
        f.write(page)
      }
      # mmdpage = `mmd2XHTML.pl HTML/#{file_name}.txt`
      `multimarkdown HTML/#{file_name}.txt > HTML/#{file_name}.html`
      post_process_page("HTML/#{file_name}.html", page_num)
    }
  end

  def post_process_page(page, page_num)
    text = IO.read(page)
    # add page number to bottom if not part page
    # if part page, add class to part number
    if text.match(/\[\%(\d)\%\]/)
      text.gsub!(/<p>\[\%(\d)\%\](.+)/, '<p class="part" id="part-\1">\2')
    else
      text << "\n<p class=\"page-num\">#{page_num}</p>"
    end
    # centered text
    text.gsub!(/<p>%c%/, '<p class="c">')

    # format first paragraph of episode
    if text.match(/\{%Episode%\}/)
      text.gsub!(/<p>\{%Episode%\}/, "<p class=\"episode\" id=\"episode-#{@episode}\"\>")
      @episode += 1
    end

    # centered text where class exists
    text.gsub!(/<p class="(.+[^>])">%c%/, '<p class="c \1">')

    # centered caps
    text.gsub!(/<p>%cc%/, '<p class="c cap">')

    # span at the end of page's last paragraph to indicate JL&R
    text.gsub!(/%j%/, '<span></span>')

    # dialogue
    text.gsub!(/<p>Jute\.%/, '<p class="dialogue jute">Jute.%')
    text.gsub!(/<p>Mutt\.%/, '<p class="dialogue mutt">Mutt.%')
    text.gsub!(/<p>%dia-cont%/, '<p class="dialogue continued">')

    # all other em-dashes (must be after #dialogue)
    text.gsub!(/%—%/, '<span class="em">—</span>')
    text.gsub!(/%——%/, '<span class="em">——</span>')

    # Ballad of Persse O'Reilly
    text.gsub!(/<p>%chorus%/, '<p class="chorus">')

    # no indent paragraph
    text.gsub!(/<p>%ni%/, '<p class="ni">')

    # no indent paragraph with leading
    text.gsub!(/<p>%ni stanza%/, '<p class="ni stanza">')

    # page 46 (long line wrapped)
    text.gsub!(/<p>%r%/, '<p class="right ni">')

    # page 94
    text.gsub!(/<p>%span-c%<\/p>/, '<span class="c">')
    text.gsub!(/<p>%\/span-c%<\/p>/, '</span>')

    # page 298 >THaN ... THaN<
    text.gsub!(/%>%THaN/, '<span class="size-4 cap">T</span><span class="size-3 cap">H</span><span class="size-2">a</span><span class="size-1">N</span>')
    text.gsub!(/%&lt;%THaN/, '<span class="size-1">T</span><span class="size-2b cap">H</span><span class="size-3b">a</span><span class="size-4 cap">N</span>')

    # wrap sigla in unique spans to be styled with CSS 3
    # %Fr% = F reversed                 pg 266
    # %Fr180% = F reversed, rotated 180 pg 121
    # %F180% = F rotated 180            pg 121
    # %F90% = F rotated 90              pg 18
    # %F270% = F rotated 270            pg 18
    # %E90% = E rotated 90              pg 119
    # %E180% = E rotated 180            pg 36
    # %M% = sigla M

    # various crazy characters
    # page 44   ballad of persse oreilly
    # page 124: čš
    # page 238: ſ
    # page 269: οὐκ ἔλαβον ...
    # ↕ ?
    # page 263: one space line
    # first italic: page 7, 24
    # check internal line tags, pages 38, 260, 263
    # check one-space line letter-spacing
    # doodles on page 299


    text.gsub!(/%Fr%/, '<span class="rev">F</span>')
    text.gsub!(/%Fr180%/, '<span class="rev-r-180">F</span>')
    text.gsub!(/%F90%/, '<span class="r-90">F</span>')
    text.gsub!(/%F180%/, '<span class="r-180">F</span>')
    text.gsub!(/%F270%/, '<span class="r-270">F</span>')
    text.gsub!(/%E90%/, '<span class="r-90">E</span>')
    text.gsub!(/%E180%/, '<span class="r-180">E</span>')

    # page 44 musical bracket
    text.gsub!(/<p>%\{%/, '<p class="brace"><span>{</span>')

    text.gsub!(/<p>%i%/, '<p class="indent">')

    # page 175
    text.gsub!(/<p>%-i%/, '<p class="neg-i">')

    # footnote problem remove []
    text.gsub!(/>\[([1-9]+)\]</, '>\1<')

    # page 260
    text.gsub!(/<p>%L%/, '<div class="l"><p>')
    text.gsub!(/%L%<\/p>/, '</p></div>')
    text.gsub!(/<p>%R%/, '<div class="r"><p>')
    text.gsub!(/%R%<\/p>/, '</p></div>')

    # page 287
    text.gsub!(/<p>%wide%<\/p>/, '<div class="wide">')
    text.gsub!(/<p>%\/wide%<\/p>/, '</div>')

    # page 383
    text.gsub!(/<p class="episode" id="episode-(\d+)">%i%/, '<p class="episode ni indent" id="episode-\1">')
    (@episode == 11) ? @special = " episode-10 page-#{page_num}" : @special = ""

    # wrap page in HTML5 document
    html_doc = <<eod
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8"/>
    <title>Finnegans Wake: Night Language</title>
    <link rel="stylesheet" href="/stylesheets/screen.css"/>%episode-10%
    <link rel="stylesheet" href="/stylesheets/ipad.css" media="only screen and (max-device-width: 1024px)"/>
    <link rel="alternate stylesheet" href="/stylesheets/screen_med.css" title="med"/>
    <link rel="alternate stylesheet" href="/stylesheets/screen_lg.css" title="lg"/>
    <script charset="utf-8" src="/javascripts/jquery.min.js" type="text/javascript"></script>
    <script charset="utf-8" src="/javascripts/jquery.cookie.js" type="text/javascript"></script>
    <script charset="utf-8" src="/javascripts/layer_engine.js" type="text/javascript"></script>
    <script type="text/javascript" src="http://use.typekit.com/jhd4ffp.js"></script>
    <script type="text/javascript">try{Typekit.load({loading:function(){wfLoading();},active:function(){wfLoaded();}});}catch(e){wfFail(e);}</script>
  </head>
  <body>

    <div class="util">
      <p>
        <span data-nl-lh="-1" title="Decrease Line-space"><m>—</m><m>—</m></span>
        <span data-nl-lh="1" title="Increase Line-space"><m>—</m><m>—</m></span>
        <span data-nl-font-type="sans" title="Sans-serif" class="font-type sans"><m>F</m></span>
        <span data-nl-font-size="-1" title="Medium Serif"><m>–</m></span>
        <span data-nl-font-size="1" title="Large Serif"><m>+</m></span>
      </p>
      <div class="gear"></div>
    </div>

    <div class="c#{@special}">

      <div class="nav">
        <a href="f_#{page_link(page_num, -1)}.html" class="prev">Previous</a>
        <a href="f_#{page_link(page_num, 1)}.html" class="next">Next</a>
      </div>

      <div class="content">

%content%

      </div>
    </div>
  </body>
</html>
eod

    epi10 = ''
    unless @special.index("episode-10").nil?
      epi10 = '
    <link rel="stylesheet" href="/stylesheets/screen_episode_10.css"/>'
    end
    html_doc.gsub!(/%episode-10%/, epi10)
    html_doc.gsub!(/%content%/, text)
    # write text back out again
    File.open(page, 'w') {|f|
      f.write(html_doc)
    }
  end

end

def page_link(page_num, num_to_add)
  page_str = (page_num += num_to_add).to_s
  "0000"[page_num.to_s.length..-1] + page_str
end

bf = BookFormatter.new("FinnegansWake.txt")
bf.xhtml_transform
