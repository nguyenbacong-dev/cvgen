class CVEditor {
    constructor() {
        this.currentRole = 'backend';
        this.cvData = {};
        this.schema = {};
        this.template = '';
        this.validator = null;
        
        this.init();
    }

    // localStorage methods
    saveToStorage(key, data) {
        try {
            const storageKey = `cvgen_${key}`;
            localStorage.setItem(storageKey, JSON.stringify(data));
            
            if (key === 'cvData') {
                this.showSavingIndicator();
            }
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
        }
    }

    showSavingIndicator() {
        let indicator = document.getElementById('savingIndicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'savingIndicator';
            indicator.className = 'saving-indicator';
            indicator.innerHTML = '<i class="fas fa-save"></i> Saved';
            document.body.appendChild(indicator);
        }
        
        indicator.classList.add('show');
        clearTimeout(this.savingTimeout);
        this.savingTimeout = setTimeout(() => {
            indicator.classList.remove('show');
        }, 1500);
    }

    loadFromStorage(key) {
        try {
            const storageKey = `cvgen_${key}`;
            const data = localStorage.getItem(storageKey);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return null;
        }
    }

    async init() {
        this.setupEventListeners();
        
        const savedRole = this.loadFromStorage('currentRole');
        if (savedRole) {
            this.currentRole = savedRole;
            document.getElementById('roleSelect').value = savedRole;
        }
        
        await this.loadRole(this.currentRole);
        this.generateForm();
        
        const savedData = this.loadFromStorage('cvData');
        if (savedData) {
            this.cvData = { ...this.cvData, ...savedData };
            this.updateFormFromData();
        }
        
        this.updateJSON();
        this.generatePreview();
    }

    setupEventListeners() {
        document.getElementById('roleSelect').addEventListener('change', (e) => {
            this.saveToStorage('currentRole', e.target.value);
            this.loadRole(e.target.value);
        });

        document.getElementById('toggleView').addEventListener('click', () => {
            this.toggleView();
        });

        document.getElementById('toggleViewFromJson').addEventListener('click', () => {
            this.toggleView();
        });

        document.getElementById('jsonEditor').addEventListener('input', (e) => {
            this.updateFromJSON(e.target.value);
        });

        document.getElementById('formatJson').addEventListener('click', () => {
            this.formatJSON();
        });

        document.getElementById('refreshPreview').addEventListener('click', () => {
            this.generatePreview();
        });

        document.getElementById('validateBtn').addEventListener('click', () => {
            this.validateData();
        });

        // Download PDF thay vì JSON
        document.getElementById('downloadPdfBtn').addEventListener('click', () => {
            this.downloadPDF();
        });

        document.getElementById('loadFileBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.loadFile(e.target.files[0]);
        });
    }

    async loadRole(role) {
        this.currentRole = role;
        
        try {
            const cvSchemaResponse = await fetch(`./cv-data/${role}/cv-schema.json`);
            if (!cvSchemaResponse.ok) {
                throw new Error(`Failed to load data: ${cvSchemaResponse.status}`);
            }
            const cvData = await cvSchemaResponse.json();
            
            this.schema = cvData;
            this.cvData = cvData;
            
            if (!this.template) {
                const templateResponse = await fetch('./cv-templates/template-1.html');
                if (!templateResponse.ok) {
                    throw new Error(`Failed to load template: ${templateResponse.status}`);
                }
                this.template = await templateResponse.text();
            }
            
            this.validator = null;
            
            this.generateForm();
            this.updateFormFromData();
            this.updateJSON();
            this.generatePreview();
            
        } catch (error) {
            console.error('Error loading role data:', error.message);
            this.showValidationMessage(`Error loading role data: ${error.message}`, 'error');
        }
    }

    generateForm() {
        const formEditor = document.getElementById('formEditor');
        formEditor.innerHTML = '';

        const sections = this.getFormSections();
        
        sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.className = 'form-section';
            
            const sectionTitle = document.createElement('h4');
            sectionTitle.textContent = section.title;
            sectionDiv.appendChild(sectionTitle);
            
            section.fields.forEach(field => {
                const fieldDiv = this.createFormField(field);
                sectionDiv.appendChild(fieldDiv);
            });
            
            formEditor.appendChild(sectionDiv);
        });

        this.addFormEventListeners();
    }

    getFormSections() {
        return [
            {
                title: 'Personal Information',
                fields: [
                    { name: 'personal_info.name', label: 'Full Name', type: 'text', required: true },
                    { name: 'personal_info.position', label: 'Position', type: 'text', required: true },
                    { name: 'personal_info.email', label: 'Email', type: 'email', required: true },
                    { name: 'personal_info.phone', label: 'Phone', type: 'text' },
                    { name: 'personal_info.location', label: 'Location', type: 'text' },
                    { name: 'personal_info.linkedin', label: 'LinkedIn', type: 'url' },
                    { name: 'personal_info.github', label: 'GitHub', type: 'url' },
                    { name: 'personal_info.portfolio', label: 'Portfolio', type: 'url' }
                ]
            },
            {
                title: 'Professional Summary',
                fields: [
                    { name: 'summary.professional_summary', label: 'Summary', type: 'textarea', help: '2-3 sentences about your background and career goals' }
                ]
            },
            { title: 'Work Experience', fields: [{ name: 'experience', label: 'Experience (JSON array)', type: 'textarea' }] },
            { title: 'Education', fields: [{ name: 'education', label: 'Education (JSON array)', type: 'textarea' }] },
            { title: 'Skills', fields: [{ name: 'skills', label: 'Skills (JSON object)', type: 'textarea' }] },
            { title: 'Projects', fields: [{ name: 'projects', label: 'Projects (JSON array)', type: 'textarea' }] },
            { title: 'Certifications', fields: [{ name: 'certifications', label: 'Certifications (JSON array)', type: 'textarea' }] },
            { title: 'Languages', fields: [{ name: 'languages', label: 'Languages (JSON array)', type: 'textarea' }] }
        ];
    }

    createFormField(field) {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = field.label;
        if (field.required) {
            label.innerHTML += ' <span style="color: red;">*</span>';
        }
        fieldDiv.appendChild(label);
        
        let input;
        if (field.type === 'textarea') {
            input = document.createElement('textarea');
            input.rows = 4;
        } else {
            input = document.createElement('input');
            input.type = field.type;
        }
        
        input.className = 'form-control';
        input.name = field.name;
        input.dataset.field = field.name;
        
        const fieldValue = this.getNestedValue(this.cvData, field.name);
        if (fieldValue !== undefined) {
            input.value = typeof fieldValue === 'object' ? JSON.stringify(fieldValue, null, 2) : fieldValue;
        }
        
        fieldDiv.appendChild(input);
        
        if (field.help) {
            const helpText = document.createElement('small');
            helpText.style.color = '#6c757d';
            helpText.textContent = field.help;
            fieldDiv.appendChild(helpText);
        }
        
        return fieldDiv;
    }

    addFormEventListeners() {
        document.querySelectorAll('.form-control').forEach(field => {
            field.addEventListener('input', (e) => this.updateDataFromForm(e.target));
        });
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => (current && current[key] !== undefined ? current[key] : undefined), obj);
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((current, key) => {
            if (!current[key]) current[key] = {};
            return current[key];
        }, obj);
        target[lastKey] = value;
    }

    updateDataFromForm(field) {
        const fieldName = field.dataset.field;
        let value = field.value;
        
        if (field.tagName === 'TEXTAREA' && !fieldName.includes('.')) {
            try {
                value = JSON.parse(field.value);
            } catch (e) {}
        }
        
        this.setNestedValue(this.cvData, fieldName, value);
        this.saveToStorage('cvData', this.cvData);
        
        this.updateJSON();
        this.generatePreview();
    }

    updateJSON() {
        document.getElementById('jsonEditor').value = JSON.stringify(this.cvData, null, 2);
    }

    updateFromJSON(jsonText) {
        try {
            this.cvData = JSON.parse(jsonText);
            this.saveToStorage('cvData', this.cvData);
            this.updateFormFromData();
            this.generatePreview();
        } catch {
            this.showValidationMessage('❌ Invalid JSON format', 'error');
        }
    }

    updateFormFromData() {
        document.querySelectorAll('.form-control').forEach(field => {
            const fieldName = field.dataset.field;
            const fieldValue = this.getNestedValue(this.cvData, fieldName);
            if (fieldValue !== undefined) {
                field.value = typeof fieldValue === 'object' ? JSON.stringify(fieldValue, null, 2) : fieldValue;
            }
        });
    }

    toggleView() {
        const formPanel = document.getElementById('formPanel');
        const jsonPanel = document.getElementById('jsonPanel');
        const toggleBtn = document.getElementById('toggleView');
        
        if (jsonPanel.style.display === 'none' || jsonPanel.style.display === '') {
            formPanel.style.display = 'none';
            jsonPanel.style.display = 'flex';
            toggleBtn.innerHTML = '<i class="fas fa-edit"></i> Form View';
        } else {
            formPanel.style.display = 'flex';
            jsonPanel.style.display = 'none';
            toggleBtn.innerHTML = '<i class="fas fa-code"></i> JSON View';
        }
    }

    formatJSON() {
        const jsonEditor = document.getElementById('jsonEditor');
        try {
            jsonEditor.value = JSON.stringify(JSON.parse(jsonEditor.value), null, 2);
        } catch {
            this.showValidationMessage('Invalid JSON format', 'error');
        }
    }

    generatePreview() {
        const previewContainer = document.getElementById('previewContainer');
        
        try {
            if (!Handlebars.helpers.join) {
                Handlebars.registerHelper('join', function(array) {
                    return Array.isArray(array) ? array.join(', ') : '';
                });
            }
            
            const template = Handlebars.compile(this.template);
            const html = template(this.cvData);
            
            previewContainer.innerHTML = `
                <iframe 
                    id="previewFrame" 
                    style="width: 100%; height: 600px; border: 1px solid #ddd; border-radius: 4px;"
                    srcdoc="${html.replace(/"/g, '&quot;')}"
                ></iframe>
            `;
            
        } catch (error) {
            previewContainer.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Error generating preview</p>
                    <small>${error.message}</small>
                </div>
            `;
        }
    }

    validateData() {
        const errors = [];
        if (!this.cvData.personal_info?.name) errors.push('Name is required');
        if (!this.cvData.personal_info?.email) errors.push('Email is required');

        if (errors.length === 0) {
            this.showValidationMessage('✅ CV data looks good!', 'success');
        } else {
            errors.forEach(err => this.showValidationMessage(`❌ ${err}`, 'error'));
        }
    }

    showValidationMessage(message, type) {
        const messages = document.getElementById('validationMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `validation-${type}`;
        messageDiv.textContent = message;
        messages.appendChild(messageDiv);
        
        setTimeout(() => messageDiv.remove(), 5000);
    }

    // ✅ Xuất PDF giống hệt preview (dùng html2canvas + jsPDF)
    async downloadPDF() {
        const { jsPDF } = window.jspdf;
        const previewFrame = document.getElementById('previewFrame');
        if (!previewFrame) return;

        const doc = new jsPDF("p", "pt", "a4");
        const content = previewFrame.contentDocument.body;
        const canvas = await html2canvas(content, { scale: 2 });
        const imgData = canvas.toDataURL("image/png");

        const pdfWidth = doc.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        doc.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
        const filename = `cv-${this.currentRole}-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
    }

    async loadFile(file) {
        if (!file) return;
        
        try {
            const text = await file.text();
            this.cvData = JSON.parse(text);
            this.saveToStorage('cvData', this.cvData);
            this.updateFormFromData();
            this.updateJSON();
            this.generatePreview();
            this.showValidationMessage('✅ File loaded successfully!', 'success');
        } catch (error) {
            this.showValidationMessage('❌ Error loading file: ' + error.message, 'error');
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new CVEditor();
});
