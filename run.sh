#!/bin/bash
# Run the CES Lead Generator app
cd "$(dirname "$0")"

PYTHON=/usr/local/bin/python3

# Install dependencies if needed
if ! $PYTHON -c "import streamlit" 2>/dev/null; then
    $PYTHON -m pip install -r requirements.txt -q
fi

STREAMLIT_CONSOLE_EMAIL= $PYTHON -m streamlit run app.py --server.headless true
