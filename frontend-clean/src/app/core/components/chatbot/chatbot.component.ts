import { Component, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../../services/auth';

interface Message {
  role: 'user' | 'ai';
  content: string;
  time: string;
  typing?: boolean;
  actions?: { label: string, link: string }[];
}

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private cdr: ChangeDetectorRef,
    private auth: AuthService
  ) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.urlAfterRedirects;
      this.isVisible = !(url === '/' || url === '' || url.includes('login') || url.includes('register'));
    });
  }

  ngOnInit() {
    this.loadHistory();
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
    this.saveHistory();

    const user = this.auth.getUser();
    const payload = { 
      message: msg,
      user_role: user?.role,
      user_name: user?.name
    };

    // Call Backend
    this.http.post<{reply: string}>('http://localhost:8000/chatbot/ask', payload)
      .subscribe({
        next: (res) => {
          aiMessage.typing = false;
          // Parse actions if any (format: [ACTION:Label|Link])
          const actions: {label: string, link: string}[] = [];
          const actionRegex = /\[ACTION:([^|]+)\|([^\]]+)\]/g;
          let cleanReply = res.reply.replace(actionRegex, (match, label, link) => {
            actions.push({ label, link });
            return '';
          });
          
          aiMessage.actions = actions;
          this.typeEffect(aiMessage, cleanReply);
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
        this.cdr.detectChanges(); 
      } else {
        clearInterval(interval);
        this.saveHistory();
      }
    }, 5); 
  }

  public formatMessage(text: string): string {
    if (!text) return '';
    let formatted = text;
    // Bold
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Inline Code
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    // Lists
    formatted = formatted.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
    if (formatted.includes('<li>')) {
      formatted = formatted.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
    }
    return formatted;
  }

  private saveHistory() {
    localStorage.setItem('chat_history', JSON.stringify(this.messagesList));
  }

  private loadHistory() {
    const history = localStorage.getItem('chat_history');
    if (history) {
      this.messagesList = JSON.parse(history);
    }
  }

  clearHistory() {
    this.messagesList = [this.messagesList[0]];
    localStorage.removeItem('chat_history');
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
