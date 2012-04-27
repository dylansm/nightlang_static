#!/usr/bin/env ruby -wKU

class BookFormatter
  
  attr_reader :parts, :episodes, :pages
  
  def initialize(book)
    text = IO.read(book)
    
    @episode = 1
    
    @episodes, @pages = [], []
    @parts = text.split(/\/\%Part\%\//)[1..-1]
    @parts.each { |part|
      # episodes = part.split(/\{\%Episode\%\}/)[1..-1]
      # puts episodes[0]
      @pages.concat(part.split(/\<\%page\%\>/)[1..-1])
    }
    # @episodes = text.split(/\{\%Episode\%\}/)
    # @pages = text.split(/\<\%page\%\>/)
  end
  
  def xhtml_transform
    @pages.each_with_index { |page, i|
      page_num = i + 1
      padding, padding_string = 4 - page_num.to_s.length, ""
      padding.times { padding_string << "0" }
      file_name = "f_#{padding_string + page_num.to_s}"
      File.open("HTML/#{file_name}.txt", 'w') {|f|
        f.write("format: snippet")
        f.write(page)
      }
      mmdpage = `mmd2XHTML.pl HTML/#{file_name}.txt`
      post_process_page("HTML/#{file_name}.html", page_num)
    }
  end
  
  def post_process_page(page, page_num)
    text = IO.read(page)
    # format first paragraph of episode
    text.gsub!(/\<p\>\{\%Episode\%\}/, "<p class=\"episode\" id=\"episode-#{@episode}\"\>")
    # add page number to bottom
    text << "\n      <p class=\"page-num\">#{page_num}</p>"
    # wrap page in HTML5 document
    html_doc = <<eod
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Finnegans Wake</title>
    <link rel="stylesheet" href="stylesheets/screen.css" />
  </head>
  <body>
    <div>

%body%

    </div>
  </body>
</html>
eod

    html_doc.gsub!(/\%body\%/, text)
    # write text back out again
    File.open(page, 'w') {|f|
      f.write(html_doc)
    }
  end
  
end

bf = BookFormatter.new("FinnegansWake.txt")
bf.xhtml_transform