import { Component, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

interface Message {
  role: 'user' | 'ai';
  content: string;
  time: string;
  typing?: boolean;
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements AfterViewChecked {
  @ViewChild('messageContainer') private messageContainer!: ElementRef;

  isOpen = false;
  isVisible = true;
  userInput = '';
  
  suggestions = [
    { label: '💼 Available Jobs', text: 'What jobs are available?', visible: true },
    { label: '👤 List Freelancers', text: 'Who are the freelancers?', visible: true },
    { label: '❓ How to apply', text: 'How do I apply for a job?', visible: true }
  ];

  messagesList: Message[] = [
    {
      role: 'ai',
      content: "Hello! I'm your HireFlow assistant 🤖<br>You can click below or ask me anything 👇",
      time: this.getTime()
    }
  ];

  constructor(private http: HttpClient, private router: Router, private cdr: ChangeDetectorRef) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      this.isVisible = !(url.includes('login') || url.includes('register'));
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    const msg = this.userInput.trim();
    if (!msg) return;

    // Add user message
    this.messagesList.push({
      role: 'user',
      content: msg,
      time: this.getTime()
    });

    this.userInput = '';
    
    // Add AI typing indicator
    const aiMessage: Message = {
      role: 'ai',
      content: '',
      time: this.getTime(),
      typing: true
    };
    this.messagesList.push(aiMessage);

    // Call Backend
    this.http.post<{reply: string}>('http://localhost:8000/chatbot/ask', { message: msg })
      .subscribe({
        next: (res) => {
          aiMessage.typing = false;
          this.typeEffect(aiMessage, res.reply);
        },
        error: (err) => {
          console.error(err);
          aiMessage.typing = false;
          aiMessage.content = "Error occurred. Please try again.";
        }
      });
  }

  quickAsk(suggestion: any) {
    this.userInput = suggestion.text;
    suggestion.visible = false;
    this.sendMessage();
  }

  private typeEffect(message: Message, text: string) {
    let i = 0;
    // Pre-format text to handle line breaks as HTML
    const formattedText = text.replace(/\n/g, '<br>');
    
    const interval = setInterval(() => {
      if (i < formattedText.length) {
        // If we encounter a <br>, add it as one unit
        if (formattedText.substring(i, i + 4) === '<br>') {
          message.content += '<br>';
          i += 4;
        } else {
          message.content += formattedText[i];
          i++;
        }
        this.scrollToBottom();
        this.cdr.detectChanges(); // Ensure the UI updates immediately
      } else {
        clearInterval(interval);
      }
    }, 5); // Slightly slower for better visibility
  }

  private getTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ":" + 
           now.getMinutes().toString().padStart(2, '0');
  }

  private scrollToBottom(): void {
    try {
      this.messageContainer.nativeElement.scrollTop = this.messageContainer.nativeElement.scrollHeight;
    } catch (err) {}
  }
}
