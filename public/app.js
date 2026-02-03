document.addEventListener('DOMContentLoaded', function () {
  const codeInputs = document.querySelectorAll('.code-input');
  const codeActions = document.getElementById('codeActions');
  const uploadBtn = document.getElementById('uploadBtn');
  const retrieveBtn = document.getElementById('retrieveBtn');
  const messageBox = document.getElementById('messageBox');
  const textarea = document.querySelector('.note-box textarea');

  const securityQuestionSelect = document.getElementById('securityQuestionSelect');
  const customSecurityQuestion = document.getElementById('customSecurityQuestion');
  const securityAnswer = document.getElementById('securityAnswer');
  const setSecuritySection = document.getElementById('setSecuritySection');
  const answerSecuritySection = document.getElementById('answerSecuritySection');
  const securityQuestionDisplay = document.getElementById('securityQuestionDisplay');
  const securityAnswerChallenge = document.getElementById('securityAnswerChallenge');

  if (securityQuestionSelect) {
    securityQuestionSelect.addEventListener('change', function () {
      const val = this.value;
      if (val === 'Custom') {
        customSecurityQuestion.style.display = 'block';
        securityAnswer.style.display = 'block';
      } else if (val) {
        customSecurityQuestion.style.display = 'none';
        securityAnswer.style.display = 'block';
      } else {
        customSecurityQuestion.style.display = 'none';
        securityAnswer.style.display = 'none';
      }
    });
  }

  codeInputs.forEach((input, index) => {
    input.addEventListener('input', function (e) {
      const value = e.target.value;
      if (!/^\d$/.test(value) && value !== '') {
        e.target.value = '';
        return;
      }

      if (value && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }

      checkCodeComplete();
    });

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Backspace' && !e.target.value && index > 0) {
        codeInputs[index - 1].focus();
      }

      if (e.key === 'ArrowLeft' && index > 0) {
        codeInputs[index - 1].focus();
      }
      if (e.key === 'ArrowRight' && index < codeInputs.length - 1) {
        codeInputs[index + 1].focus();
      }
    });

    input.addEventListener('paste', function (e) {
      e.preventDefault();
      const pastedData = e.clipboardData.getData('text').trim();
      if (/^\d{4}$/.test(pastedData)) {
        pastedData.split('').forEach((char, i) => {
          if (codeInputs[i]) {
            codeInputs[i].value = char;
          }
        });
        checkCodeComplete();
        codeInputs[codeInputs.length - 1].focus();
      }
    });
  });

  function checkCodeComplete() {
    const code = Array.from(codeInputs).map(input => input.value).join('');
    if (code.length === 4) {
      // Enable buttons
      uploadBtn.disabled = false;
      retrieveBtn.disabled = false;
      uploadBtn.title = "Save text data";

      setSecuritySection.style.display = 'block';
      answerSecuritySection.style.display = 'none';
      securityAnswerChallenge.value = '';

      fetch(`/check-code/${code}`)
        .then(res => res.json())
        .then(data => {
          if (data.exists) {
            showMessage('Code already in use! Please choose a different code.', 'error');
            uploadBtn.disabled = true;
            uploadBtn.title = "Code already taken";
            retrieveBtn.disabled = false;
          } else {
            showMessage('Code available. Select Save to store your text.', 'success');
            uploadBtn.disabled = false;
            uploadBtn.title = "Save text data";
            retrieveBtn.disabled = true;
          }
        })
        .catch(err => {
          console.error('Error checking code:', err);
        });
    } else {
      // Disable buttons
      uploadBtn.disabled = true;
      retrieveBtn.disabled = true;
      messageBox.style.display = 'none';
    }
  }

  function showMessage(message, type = 'info') {
    messageBox.textContent = message;
    messageBox.className = `message-box message-${type}`;
    messageBox.style.display = 'block';

    setTimeout(() => {
      if (type !== 'error') messageBox.style.display = 'none';
      else setTimeout(() => messageBox.style.display = 'none', 5000);
    }, 5000);
  }

  function getCurrentCode() {
    return Array.from(codeInputs).map(input => input.value).join('');
  }

  function getSecurityData() {
    const questionSelect = securityQuestionSelect.value;
    let question = questionSelect;
    if (questionSelect === 'Custom') {
      question = customSecurityQuestion.value.trim();
    }
    const answer = securityAnswer.value.trim();
    return { question, answer };
  }

  if (uploadBtn) {
    uploadBtn.addEventListener('click', async function () {
      const code = getCurrentCode();
      if (code.length !== 4) {
        showMessage('Please enter a 4-digit code', 'error');
        return;
      }

      const text = textarea ? textarea.value.trim() : '';
      const { question, answer } = getSecurityData();

      if (!text) {
        showMessage('Please enter text to save', 'error');
        return;
      }

      if (question && !answer) {
        showMessage('Please provide an answer for the security question', 'error');
        return;
      }

      try {
        uploadBtn.disabled = true;
        uploadBtn.textContent = 'Saving...';

        const payload = {
          text,
          code,
          securityQuestion: question || undefined,
          securityAnswer: answer || undefined
        };

        const response = await fetch('/save-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        let result;
        try { result = await response.json(); } catch (e) { throw new Error('Invalid server response'); }

        if (result.success) {
          showMessage(result.message || 'Saved successfully!', 'success');
          if (textarea) textarea.value = '';
          if (securityQuestionSelect) securityQuestionSelect.value = '';
          if (customSecurityQuestion) customSecurityQuestion.style.display = 'none';
          if (securityAnswer) {
            securityAnswer.value = '';
            securityAnswer.style.display = 'none';
          }
          // Clear code inputs
          codeInputs.forEach(input => input.value = '');
          checkCodeComplete();
        } else {
          showMessage(result.error || 'Operation failed', 'error');
        }

      } catch (error) {
        console.error('Upload error:', error);
        showMessage('An error occurred: ' + error.message, 'error');
      } finally {
        uploadBtn.disabled = false;
        uploadBtn.textContent = 'Save';
      }
    });
  }

  if (retrieveBtn) {
    retrieveBtn.addEventListener('click', async function () {
      const code = getCurrentCode();
      if (code.length !== 4) {
        showMessage('Please enter a 4-digit code', 'error');
        return;
      }

      const challengeAnswer = securityAnswerChallenge.value.trim();
      let url = `/retrieve/${code}`;
      if (challengeAnswer) {
        url += `?answer=${encodeURIComponent(challengeAnswer)}`;
      }

      try {
        retrieveBtn.disabled = true;
        retrieveBtn.textContent = 'Retrieving...';

        const response = await fetch(url);
        let result;
        try { result = await response.json(); } catch (e) { throw new Error('Invalid server response'); }

        if (!response.ok) {
          showMessage(result.error || `Retrieve failed: ${response.status}`, 'error');
          return;
        }

        if (result.restricted) {
          showMessage(result.message || 'Security Question Required', 'error');
          setSecuritySection.style.display = 'none';
          answerSecuritySection.style.display = 'block';
          securityQuestionDisplay.textContent = result.question || 'Security Question:';
          securityAnswerChallenge.focus();
          retrieveBtn.textContent = 'Verify & Retrieve';
          return;
        }

        if (result.success && result.data) {
          const data = result.data;

          setSecuritySection.style.display = 'block';
          answerSecuritySection.style.display = 'none';
          securityAnswerChallenge.value = '';
          retrieveBtn.textContent = 'Retrieve';

          if (textarea) {
            textarea.value = data.title || '';
          }

          let successMsg = 'Data retrieved successfully!';
          showMessage(successMsg, 'success');

        } else {
          showMessage(result.error || 'No data found', 'error');
        }
      } catch (error) {
        console.error('Retrieve error:', error);
        showMessage('Error: ' + error.message, 'error');
      } finally {
        if (retrieveBtn.textContent !== 'Verify & Retrieve') {
          retrieveBtn.disabled = false;
          retrieveBtn.textContent = 'Retrieve';
        } else {
          retrieveBtn.disabled = false;
        }
      }
    });
  }

  const codeTypeSelect = document.getElementById('codeType');
  if (codeTypeSelect) {
    codeTypeSelect.addEventListener('change', function (e) {
      if (e.target.value === 'generate') {
        const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
        randomCode.split('').forEach((char, i) => {
          if (codeInputs[i]) codeInputs[i].value = char;
        });
        checkCodeComplete();
      }
    });
  }
});
