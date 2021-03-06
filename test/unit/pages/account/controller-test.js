'use strict';

import chai, { expect } from 'chai';
import sinon from 'sinon';
import { default as sinonChai } from 'sinon-chai';
import ElectronMock from '../../../mock/electron';
import AccountController from 'browser/pages/account/controller';
import TokenStore from 'browser/services/credentialManager';
import fs from 'fs-extra';
import rimraf from 'rimraf';
import mkdirp from 'mkdirp';

chai.use(sinonChai);

describe('Account controller', function() {

  let controller, timeout, scope;
  let http, base64;
  let sandbox = sinon.sandbox.create();
  let electron = new ElectronMock();

  beforeEach(function() {
    timeout = sandbox.stub();
    scope = { '$apply': function() { }, '$watch': function(event, cb) { cb && cb() } };
    base64 = { encode: function() {}};
    http = sandbox.stub().resolves('success');
    controller = new AccountController({go:sandbox.stub()}, timeout, scope, http, base64, {password: '', username: ''}, electron);
  });

  afterEach(function() {
    sandbox.restore();
  });


  describe('initial state', function() {

    it('should not be failed', function() {
      expect(controller).to.have.property('authFailed', false);
    });

    it('username should be empty', function() {
      expect(controller).to.have.property('username').to.be.empty;
    });

    it('password should be empty', function() {
      expect(controller).to.have.property('password').to.be.empty;
    });

    it('terms and conditions should be considered signed', function() {
      expect(controller).to.have.property('tandcNotSigned').to.be.false;
    });
  });

  describe('getUserAgent', function() {
    it('returns electron\'s userAgent name', function() {
      let getUserAgentSpy = sandbox.spy(electron.remote.getCurrentWindow().webContents.session, 'getUserAgent');
      let agent = controller.getUserAgent();
      expect(getUserAgentSpy).calledOnce;
      expect(agent).is.equal('agent');
    });
  });

  describe('login', function() {

    before(function() {
      sinon.stub(AccountController.prototype, 'getUserAgent');
    });

    it('should make an HTTP request', function() {
      controller.login();
      expect(http).to.have.been.calledOnce;
    });

    it('should make a GET request with correct username and password', function() {
      http = sinon.stub().resolves({
        status: 200,
        data: true
      });

      let req = {
        auth: { pass: 'password', sendImmediately: true, user: 'username' },
        followAllRedirects: true,
        headers: {
          Accept: 'application/json, text/plain, */*'},
        method: 'GET',
        rejectUnauthorized: true,
        url: 'https://developers.redhat.com/download-manager/rest/tc-accepted?downloadURL=/file/cdk-2.1.0.zip'
      };
      let installerDataSvc = { setCredentials: function() {} };
      let router = {go: function() {}};
      controller = new AccountController(router, timeout, scope, http, base64, installerDataSvc, electron);
      controller.username = 'username';
      controller.password = 'password';
      controller.login();

      expect(http).to.have.been.calledWith(req);
      expect(http).to.have.been.calledOnce;
    });

    it('should call handleHttpFailure on HTTP failure', function() {
      http = ()=> Promise.reject('serious error');
      controller = new AccountController({}, timeout, scope, http, base64, {}, electron);
      let spy = sinon.spy(controller, 'handleHttpFailure');

      controller.login();

      return http().then(function() {
        expect.fail();
      }).catch(function() {
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith('serious error');
      });
    });

    it('should call handleHttpSuccess on successful HTTP request', function() {
      http = ()=> Promise.resolve({ status: 404 });
      controller = new AccountController({}, timeout, scope, http, base64, {}, electron);
      let spy = sinon.spy(controller, 'handleHttpSuccess');

      controller.login();

      return http().then(function() {
        expect.fail();
      }).catch(function() {
        expect(spy).to.have.been.calledOnce;
        expect(spy).to.have.been.calledWith({ status: 404 });
      });
    });
  });

  describe('handleHttpFailure', function() {
    it('should set authFailed after failure', function() {
      controller.handleHttpFailure('some error');
      expect(controller.authFailed).to.be.false;
      expect(controller.tandcNotSigned).to.be.false;
      expect(controller.httpError).to.be.not.undefined;
    });
  });

  describe('createAccount', function() {
    it('should open createAccount url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      controller.createAccount();
      expect(electron.shell.openExternal).calledOnce;
      expect(electron.shell.openExternal).to.have.been.calledWith('https://developers.redhat.com/auth/realms/rhd/protocol/openid-connect/registrations?client_id=web&response_mode=fragment&response_type=code&redirect_uri=https%3A%2F%2Fdevelopers.redhat.com%2F%2Fconfirmation');
    });
  });

  describe('forgotPassword', function() {
    it('should open forgotPassword url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      controller.forgotPassword();
      expect(electron.shell.openExternal).calledOnce;
      expect(electron.shell.openExternal).to.have.been.calledWith('https://developers.redhat.com/auth/realms/rhd/login-actions/reset-credentials');
    });
  });

  describe('resetLoginErrors', function() {
    it('should able to reset login error', function() {
      controller.resetLoginErrors();
      expect(controller.tandcNotSigned).to.be.false;
      expect(controller.httpError).to.be.undefined;
      expect(controller.authFailed).to.be.false;
    });
  });

  describe('isValid', function() {
    it('should return false if $invalid is true and $dirty is true', function() {
      expect(controller.isValid({$invalid: true, $dirty: true})).to.be.false;
    });

    it('should return false if $dirty is false', function() {
      expect(controller.isValid({$invalid: true, $dirty: false, $touched: true})).to.be.false;
    });

    it('should return false if $touched is false', function() {
      expect(controller.isValid({$invalid: true, $dirty: true, $touched: false})).to.be.false;
    });

    it('should return false if $invalid, $dirty and $touched are true', function() {
      expect(controller.isValid({$invalid: true, $dirty: true, $touched: true})).to.be.false;
    });

    it('should return true if $invalid is false', function() {
      expect(controller.isValid({$invalid: false})).to.be.true;
    });
  });

  describe('gotoDRH', function() {
    it('should open DRH url in browser using electron.shell.openExternal', function() {
      sandbox.stub(electron.shell);
      controller.gotoDRH();
      expect(electron.shell.openExternal).calledOnce;
      expect(electron.shell.openExternal).to.have.been.calledWith('https://developers.redhat.com');
    });
  });

  describe('handleHttpSuccess', function() {
    it('should set authFailed when return code of HTTP request is not 200', function() {
      controller.handleHttpSuccess({ status: 404 });
      expect(controller.authFailed).to.be.true;
      expect(controller.tandcNotSigned).to.be.false;
    });

    it('should set tandcNotSigned when data is false', function() {
      controller.handleHttpSuccess({ status: 200, data: false });
      expect(controller.authFailed).to.be.false;
      expect(controller.tandcNotSigned).to.be.true;
    });

    it('should go to the page "confirm" when everything is OK', function() {
      let router = { go: function() {} };
      let spy = sinon.spy(router, 'go');
      let installerDataSvc = { setCredentials: function() {} };

      controller = new AccountController(router, timeout, scope, null, null, installerDataSvc, electron);
      controller.handleHttpSuccess({ status: 200, data: true });

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('install');
      expect(controller.tandcNotSigned).to.be.false;
      expect(controller.authFailed).to.be.false;
    });

    it('should save credentials for later use when request.status is OK and response text is `true`', function() {
      let router = { go: function() {} };
      let installerDataSvc = { setCredentials: function() {} };
      let spy = sinon.spy(installerDataSvc, 'setCredentials');
      sandbox.stub(mkdirp, 'sync');
      sandbox.stub(fs, 'writeFileSync');
      sandbox.stub(TokenStore, 'setItem');
      controller = new AccountController(router, timeout, scope, null, null, installerDataSvc, electron);
      controller.rememberMe = true;
      controller.username = 'Frank';
      controller.password = 'p@ssw0rd';

      controller.handleHttpSuccess({ status: 200, data: true });

      expect(spy).to.have.been.calledOnce;
      expect(spy).to.have.been.calledWith('Frank', 'p@ssw0rd');
      expect(controller.tandcNotSigned).to.be.false;
      expect(controller.authFailed).to.be.false;
    });

  });

  describe('save', function() {
    beforeEach(function() {
      let checkbox = {
        checked: false
      };
      global.document = {
        getElementById: sandbox.stub().returns(checkbox)
      };
      global.localStorage = {
        setItem: sandbox.stub()
      };
      sandbox.stub(fs, 'existsSync').returns(true);
      sandbox.stub(TokenStore, 'deleteItem');
      sandbox.stub(rimraf, 'sync');
    });
    it('should save entered user name and password if `Remember me` is set', function() {
      controller.username = 'user1';
      controller.password = 'password';
      controller.save();
    });
    afterEach(function() {
      delete global.document;
    });
  });
  describe('exit', function() {
    it('should close active window', function() {
      sandbox.stub(electron.remote.currentWindow);
      controller.exit();
      expect(electron.remote.currentWindow.close).calledOnce;
    });
  });
  describe('back', function() {
    it('should navigate to confirmation page', function() {
      controller.back();
      expect(controller.router.go).calledWith('confirm');
    });
  });

});
