#!/usr/bin/env ruby -wKU

class Pager
  
  def initialize(book)
    @book = book
    @text = ""
    text = IO.read(book)
    
    i = 1
    
    @text = text.gsub!(/\<%page%\>/) { |s|
      i += 1
      "<%page-#{i}%>"
    }
    
  end
  
  def save
    File.open(@book, 'w') {|f|
      f.write(@text)
    }
  end
  
end

p = Pager.new("FinnegansWake.txt")
p.save