import { app } from "./app";
import dotenv from "dotenv";

dotenv.config();

import "./workers/file.worker"; // Start the worker AFTER loading env vars

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


//TODO: 
// 1. add rate limiting
// 2. give proper naming to chats based on first question asked
// 3. for now we are just ending current question and context based on the results from vector db, but we can improve it by maintaining a separate summary of the chat so far and using that as context too.
//4. pdfs are stored in local storage for now, move them to s3 or supabase storage
