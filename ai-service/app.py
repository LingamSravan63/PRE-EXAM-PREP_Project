import os
import google.generativeai as genai
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import PyPDF2
from docx import Document
import json

# Load environment variables from .env file
load_dotenv()

# Configure the Gemini API
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Create a new model (gemini-1.5-flash is recommended)
model = genai.GenerativeModel("gemini-2.5-flash")

app = Flask(__name__)
CORS(app) # Enable Cross-Origin Resource Sharing

# Function to extract text from a PDF file
def extract_text_from_pdf(file):
    pdf_reader = PyPDF2.PdfReader(file)
    text = ""
    for page in pdf_reader.pages:
        text += page.extract_text()
    return text

# Function to extract text from a DOCX file
def extract_text_from_docx(file):
    doc = Document(file)
    text = ""
    for para in doc.paragraphs:
        text += para.text + "\n"
    return text

@app.route('/api/process', methods=['POST'])
def process_document():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    try:
        text = ""
        if file.filename.endswith('.pdf'):
            text = extract_text_from_pdf(file.stream)
        elif file.filename.endswith('.docx'):
            text = extract_text_from_docx(file.stream)
        else:
            return jsonify({'error': 'Unsupported file type'}), 400
            
        if not text.strip():
            return jsonify({'error': 'Could not extract text from the document.'}), 500

        # --- AI Generation ---
        # 1. Generate Summary
        summary_prompt = f"""
        Analyze the following text in detail and provide a comprehensive summary. 
        Break down the key concepts, explain important definitions, and cover all major topics presented. 
        The summary should be thorough enough for someone to get a deep understanding of the material without reading the original document.
        Use markdown for headings and lists to structure the summary clearly.

        Text:
        {text}
        """
        summary_response = model.generate_content(summary_prompt)
        
        # 2. Generate Questions for ALL THREE difficulties
        question_prompt = f"""Based on the following text, generate question sets for Easy, Medium, and Hard difficulty levels.
        
        For each difficulty level ('easy', 'medium', 'hard'), provide:
        1. 5 Multiple Choice Questions (MCQs).
        2. 5 "Match the Following" questions.

        For MCQs, provide 4 options and the correct answer.
        For "Match the Following", provide 5 "prompts", 5 corresponding "answers" (shuffled), and a 'solution' object mapping prompts to correct answers.

        Format the output strictly as a single JSON object with three main keys: 'easy', 'medium', and 'hard'.
        Each of these keys should contain an object with 'mcqs' and 'matching' keys, following the structure described above.
        
        Example for 'easy': {{ "mcqs": [...], "matching": {{...}} }}
        
        Text:
        {text}
        """
        question_response = model.generate_content(question_prompt)

        # Clean up the AI response to be valid JSON
        cleaned_json_text = question_response.text.replace("```json", "").replace("```", "").strip()
        
        return jsonify({
            'summary': summary_response.text,
            'questions': json.loads(cleaned_json_text)
        })

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(port=5001, debug=True)