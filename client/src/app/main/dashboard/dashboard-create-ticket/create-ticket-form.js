import React from 'react';
import _ from 'lodash';
import { connect } from 'react-redux';

import history from 'lib-app/history';
import i18n from 'lib-app/i18n';
import API from 'lib-app/api-call';
import SessionStore from 'lib-app/session-store';
import LanguageSelector from 'app-components/language-selector';
import DepartmentDropdown from 'app-components/department-dropdown';
import Captcha from 'app/main/captcha';
import { getPublicDepartmentIndexFromDepartmentId } from 'app/admin/panel/staff/admin-panel-departments';

import Header from 'core-components/header';
import TextEditor from 'core-components/text-editor';
import Form from 'core-components/form';
import FormField from 'core-components/form-field';
import SubmitButton from 'core-components/submit-button';
import Message from 'core-components/message';

class CreateTicketForm extends React.Component {
    static propTypes = {
        userLogged: React.PropTypes.bool,
        isStaff: React.PropTypes.bool,
        isInternal: React.PropTypes.bool,
        onSuccess: React.PropTypes.func,
    };

    static defaultProps = {
        userLogged: true,
        isStaff: false,
    };

    state = {
        loading: false,
        message: null,
        form: {
            title: '',
            content: TextEditor.createEmpty(),
            email: '',
            name: '',
            language: this.props.language,
            clientIndex: 0,
            clientUserIndex: 0,
            departmentIndex: 0,
            // departmentIndex: getPublicDepartmentIndexFromDepartmentId(
            //     this.props.defaultDepartmentId
            // ),
        },
        clients: [],
        departments: [],
        clientUsers: [],
    };

    componentDidMount() {
        this.getDepartments();
    }

    componentDidUpdate(_prevProps, prevState) {
        if (
            prevState.form.departmentIndex !== this.state.form.departmentIndex
        ) {
            this.setState({
                ...this.state,
                clients: [],
                clientUsers: [],
            });
            this.getClients();
        }
        if (prevState.form.clientIndex !== this.state.form.clientIndex) {
            this.setState({
                ...this.state,
                clientUsers: [],
            });
            this.getClientUsers();
        }
    }

    render() {
        return (
            <div className="create-ticket-form">
                <Header
                    title={i18n('CREATE_TICKET')}
                    description={i18n('CREATE_TICKET_DESCRIPTION')}
                />
                <Form {...this.getFormProps()}>
                    {!this.props.userLogged ? this.renderEmailAndName() : null}
                    <FormField
                        label={i18n('TITLE')}
                        name="title"
                        validation="TITLE"
                        required
                        field="input"
                        fieldProps={{ size: 'large' }}
                    />
                    <div className="row">
                        {this.renderDepartments()}
                        {this.renderClients()}
                        {this.renderUsers()}
                        {this.renderLanguages()}
                    </div>
                    <FormField
                        label={i18n('CONTENT')}
                        name="content"
                        validation="TEXT_AREA"
                        fieldProps={{
                            allowImages: this.props.allowAttachments,
                        }}
                        required
                        field="textarea"
                    />
                    {this.props.allowAttachments
                        ? this.renderFileUpload()
                        : null}
                    {!this.props.userLogged ? this.renderCaptcha() : null}
                    <SubmitButton>{i18n('CREATE_TICKET')}</SubmitButton>
                </Form>
                {this.renderMessage()}
            </div>
        );
    }

    // getDepartments() {
    //     // Old way, get departments from local storage
    //     // return SessionStore.getDepartments();

    //     // return this.props.departments;
    //     return SessionStore.getDepartments().map(department => {
    //         if(department.private*1){
    //             return <spam>{department.name} <Icon name='user-secret'/> </spam>
    //         } else {
    //             return department.name;
    //         }
    //     });
    // }

    getDepartments() {
        const isStaff = this.props.isStaff;
        API.call({
            path: '/department/get-departments',
            dataAsForm: false,
            data: { isStaff },
        }).then(res => {
            if (showLogs) console.log(res.data);
            this.setState(
                {
                    ...this.state,
                    departments: res.data.departments,
                },
                () => this.getClients()
            );
        });
    }

    getClients() {
        delete this.state.form.staffClientId;
        delete this.state.form.clientUserId;
        delete this.state.form.clientId;
        const { id: departmentId } = this.getDepartmentFromDepartmentIndex(
            this.state.form.departmentIndex
        );
        if(parseInt(departmentId) === 2) {
            const departmentFranchising = _.filter(SessionStore.getDepartments(),item => item.isFranchising == 1);
            this.setState(
                {
                    ...this.state,
                    clients: departmentFranchising,
                },
                () => this.getClientUsers()
            );
        }
        else {
            API.call({
                path: '/client/get-clients-departments',
                dataAsForm: false,
                data: { departmentId },
            }).then(res => {
                if (showLogs) console.log(res.data);
                this.setState(
                    {
                        ...this.state,
                        clients: res.data.clients,
                    },
                    () => this.getClientUsers()
                );
            });
        }
    }

    getClientUsers() {
        /*
            departmentId is franchising.
            In case of choosing a franchising department the client will be a company franchise (Next), with that the consultation
            of a user becoming a Staff consultation 
        */
        const { id: clientId } = this.getClientFromClientIndex(
            this.state.form.clientIndex
        );
        const { id: departmentId } = this.getDepartmentFromDepartmentIndex(
            this.state.form.departmentIndex
        );
        if(parseInt(departmentId) === 2 && this.props.isInternal) {
            API.call({
                path: '/department/get-department-staffs',
                dataAsForm: true,
                data: { departmentId: clientId },
            }).then(res => {
                if (showLogs) console.log(res.data);
                this.setState({
                    ...this.state,
                    clientUsers: res.data.staffs,
                });
            });
        }
        else {
            this.setState(_.omit(this.state.form, 'staffClientId'));
            API.call({
                path: '/client/get-client-users',
                dataAsForm: true,
                data: { clientId },
            }).then(res => {
                if (showLogs) console.log(res.data);
                this.setState({
                    ...this.state,
                    clientUsers: res.data.clientUsers,
                });
            });
        }
    }

    getDepartmentFromDepartmentIndex(index) {
        return this.state.departments[index];
    }

    getClientFromClientIndex(index) {
        return this.state.clients[index];
    }

    getClientUserFromClientUserIndex(index) {
        return this.state.clientUsers[index];
    }

    renderDepartments() {
        if (this.props.isDefaultDepartmentLocked * 1 && !this.props.isStaff) {
            return null;
        }
        return (
            <FormField
                className="col-md-4"
                label={i18n('DEPARTMENT')}
                name="departmentIndex"
                field="select"
                fieldProps={{
                    size: 'medium',
                    items: this.state.departments.map(department => ({
                        content: department.name,
                    })),
                }}
                required
            />
        );
    }

    isInternalNoRender() {
        if (
            this.getDepartmentFromDepartmentIndex(
                this.state.form.departmentIndex
            )
        ) {
            const { id: departmentId } = this.getDepartmentFromDepartmentIndex(
                this.state.form.departmentIndex
            );
            if (!this.props.isInternal && parseInt(departmentId) === 2) {
                return null;
            }
        }
        return 'CAN RENDER';
    }

    renderClients() {
        if (!this.props.isStaff) {
            return null;
        }
        if (!this.isInternalNoRender()) {
            return null;
        }
        return (
            <FormField
                className="col-md-4"
                label={i18n('CUSTOMER')}
                name="clientIndex"
                field="select"
                fieldProps={{
                    size: 'medium',
                    items: this.state.clients.map(client => ({
                        content: client.name,
                    })),
                }}
                required
            />
        );
    }

    renderUsers() {
        if (!this.props.isStaff) {
            return null;
        }
        if (!this.isInternalNoRender()) {
            return null;
        }

        return (
            <FormField
                className="col-md-4"
                label={i18n('USER')}
                name="clientUserIndex"
                field="select"
                fieldProps={{
                    size: 'medium',
                    items: this.state.clientUsers.map(clientUser => ({
                        content: clientUser.name,
                    })),
                }}
                required
            />
        );
    }

    renderLanguages() {
        if (this.props.onlyOneSupportedLanguage) {
            return null;
        }
        return (
            <FormField
                className="col-md-4"
                label={i18n('LANGUAGE')}
                name="language"
                field="select"
                decorator={LanguageSelector}
                fieldProps={{
                    type: 'supported',
                    size: 'medium',
                }}
            />
        );
    }

    renderEmailAndName() {
        return (
            <div className="row">
                <FormField
                    className="col-md-6"
                    label={i18n('EMAIL')}
                    name="email"
                    validation="EMAIL"
                    required
                    field="input"
                    fieldProps={{ size: 'large' }}
                />
                <FormField
                    className="col-md-6"
                    label={i18n('FULL_NAME')}
                    name="name"
                    validation="NAME"
                    required
                    field="input"
                    fieldProps={{ size: 'large' }}
                />
            </div>
        );
    }

    renderFileUpload() {
        return (
            <div className="create-ticket-form__file">
                <FormField className="upload-button" name="file" field="file" />
            </div>
        );
    }

    renderCaptcha() {
        return (
            <div className="create-ticket-form__captcha">
                <Captcha ref="captcha" />
            </div>
        );
    }

    renderMessage() {
        switch (this.state.message) {
            case 'success':
                return (
                    <Message
                        className="create-ticket-form__message"
                        type="success"
                    >
                        {i18n('TICKET_SENT')}
                    </Message>
                );
            case 'fail':
                return (
                    <Message
                        className="create-ticket-form__message"
                        type="error"
                    >
                        {i18n('TICKET_SENT_ERROR')}
                    </Message>
                );
            default:
                return null;
        }
    }

    getFormProps() {
        return {
            loading: this.state.loading,
            onSubmit: this.onSubmit.bind(this),
            values: this.state.form,
            onChange: form => this.setState({ form }),
        };
    }

    onSubmit(formState) {
        let captcha =
            this.refs.captcha && this.refs.captcha.getWrappedInstance();

        if (captcha && !captcha.getValue()) {
            captcha.focus();
        } else {
            this.setState({
                loading: true,
            });

            let ticketExtraData = {};

            if (this.props.isStaff) {
                if (this.props.isInternal) {
                    ticketExtraData = {
                        departmentId: this.getDepartmentFromDepartmentIndex(
                            this.state.form.departmentIndex
                        ).id,
                        clientId: this.getClientFromClientIndex(
                            this.state.form.clientIndex
                        ).id,
                        clientUserId: this.getClientUserFromClientUserIndex(
                            this.state.form.clientUserIndex
                        ).id,
                    };
                }
                if (
                    !this.props.isInternal &&
                    parseInt(
                        this.getDepartmentFromDepartmentIndex(
                            this.state.form.departmentIndex
                        ).id
                    ) === 2
                ) {
                    ticketExtraData = {
                        departmentId: this.getDepartmentFromDepartmentIndex(
                            this.state.form.departmentIndex
                        ).id,
                    };
                }
                else if(parseInt(
                    this.getDepartmentFromDepartmentIndex(
                        this.state.form.departmentIndex
                    ).id
                ) === 2 && this.props.isInternal) {
                    ticketExtraData = {
                        departmentId: this.getDepartmentFromDepartmentIndex(
                            this.state.form.departmentIndex
                        ).id,
                        staffClientId: this.getClientUserFromClientUserIndex(
                            this.state.form.clientUserIndex
                        ).id,
                    };
                }
            } else {
                ticketExtraData = {
                    departmentId: this.getDepartmentFromDepartmentIndex(
                        this.state.form.departmentIndex
                    ).id,
                };
            }
            API.call({
                path: '/ticket/create',
                dataAsForm: true,
                data: _.extend(formState, ticketExtraData, {
                    captcha: captcha && captcha.getValue(),
                }),
            })
                .then(this.onTicketSuccess.bind(this, formState.email))
                .catch(this.onTicketFail.bind(this));

            // API.call({
            //     path: '/ticket/create',
            //     dataAsForm: true,
            //     data: _.extend(
            //         {},
            //         formState,
            //         TextEditor.getContentFormData(formState.content),
            //         {
            //             captcha: captcha && captcha.getValue(),
            //             departmentId: this.getDepartments()[
            //                 formState.departmentIndex
            //             ].id,
            //             ...ticketExtraData,
            //         }
            //     ),
            // })
            //     .then(this.onTicketSuccess.bind(this, formState.email))
            //     .catch(this.onTicketFail.bind(this));
        }
    }

    onTicketSuccess(email, result) {
        let message = 'success';
        this.setState(
            {
                loading: false,
                message: message,
            },
            () => {
                if (this.props.onSuccess) {
                    this.props.onSuccess(result, email, message);
                }
            }
        );
    }

    onTicketFail() {
        this.setState({
            loading: false,
            message: 'fail',
        });
    }
}

export default connect(store => {
    const { language, supportedLanguages } = store.config;
    return {
        language: _.includes(supportedLanguages, language)
            ? language
            : supportedLanguages[0],
        onlyOneSupportedLanguage: supportedLanguages.length == 1 ? true : false,
        isDefaultDepartmentLocked: store.config['default-is-locked'],
        allowAttachments: store.config['allow-attachments'],
        defaultDepartmentId: store.config['default-department-id'],
        departments: store.session.userDepartments,
        isInternal: store.session.isInternal == true,
    };
})(CreateTicketForm);
