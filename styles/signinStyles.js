export const signinStyles = `
.signin-form {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
}

.signin-input {
  width: 260px;
  background: rgba(255,255,255,.06);
  color: #e6e8ef;
  border: 1px solid rgba(255,255,255,.12);
  padding: 10px 12px;
  border-radius: 10px;
  display: block;
}

.signin-input::placeholder {
  color: #9aa3b2;
}

.btn-ghost {
  appearance: none;
  border: 1px solid rgba(255,255,255,.1);
  background: transparent;
  color: #e6e8ef;
  padding: 10px 14px;
  border-radius: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: transform .14s ease, background .2s ease, border-color .2s ease;
}
.btn-ghost:hover { 
  background: rgba(255,255,255,.06); 
  transform: translateY(-1px); 
}
.btn-ghost:focus-visible { 
  outline: 0; 
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.45); 
}
.btn-ghost:active { 
  transform: translateY(0); 
}
`;
