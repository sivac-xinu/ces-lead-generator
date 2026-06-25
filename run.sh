#!/bin/bash
# Run the CES Lead Generator app
cd "$(dirname "$0")"
pip install -r requirements.txt -q
streamlit run app.py
