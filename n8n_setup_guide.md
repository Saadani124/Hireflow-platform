# 🚀 Collaborator's Guide: n8n Setup & Workflow Import

To test the full functionality of the Hireflow platform (email verification, admin alerts, etc.), you need to have **n8n** running locally. This guide explains how to set it up and import the project's automation workflows.

---

## 1. Install n8n
If you don't have n8n installed, you can install it globally via npm:

```bash
npm install n8n -g
```

## 2. Start n8n
Run the following command in your terminal:

```bash
n8n start
```
Once it starts, open your browser and go to: `http://localhost:5678`

---

## 3. Import Workflows
The automation logic (Webhooks, Email nodes, Logic) is stored in JSON files provided in this project (usually in a `/n8n_workflows` folder).

For each JSON file:
1.  In n8n, click on **Workflows** -> **Add Workflow** (or **New**).
2.  Click the **three dots (⋮)** in the top-right corner.
3.  Select **Import from File**.
4.  Choose the `.json` workflow file.
5.  **CRITICAL:** Toggle the switch in the top-right corner to **Active**. If it's not active, the backend won't be able to trigger it.

---

## 4. Configure Credentials
n8n does **not** export passwords or API keys for security reasons. You must set up your own email provider:

1.  Go to **Credentials** in the left sidebar.
2.  Click **Add Credential** and search for **Gmail** or **SMTP**.
3.  Follow the prompts to connect your account.
4.  Go back to your imported workflows, click on the **Email node**, and select your newly created credential.

---

## 5. Synchronize Backend URLs
Every time you import a workflow, n8n generates a unique **Webhook URL**. You must tell the backend where to find your n8n instance.

1.  In n8n, click on the **Webhook node** (usually the first node in the workflow).
2.  Copy the **Production URL** (e.g., `http://localhost:5678/webhook/123-abc`).
3.  Open your `backend/.env` file.
4.  Update the corresponding URL variable:
    ```env
    N8N_VERIFICATION_WEBHOOK_URL=http://localhost:5678/webhook/your-unique-id
    N8N_REPORT_WEBHOOK_URL=http://localhost:5678/webhook/another-unique-id
    ```

---

## 6. Verification
To test if it's working:
-   **Email:** Register as a new freelancer. You should see a request hit n8n, and an email should arrive in your inbox.
-   **Reports:** Report a job twice as an admin. On the 3rd report, n8n should trigger an alert.

---

*Happy Testing!*
