// JEV L7.1 Global Sentinel & FaceID Identity Binding Test
// Codenamed: JEV.Test.GlobalSentinel

const GlobalSentinel = require('./modules/globalSentinel');
const fs = require('fs');
const path = require('path');

async function main() {
    console.log('====================================================');
    console.log('JEV L7.1 Global Sentinel & FaceID Identity Binding Test');
    console.log('====================================================\n');

    try {
        // Initialize Global Sentinel
        const sentinel = new GlobalSentinel();
        
        // Start the sentinel
        const success = await sentinel.initialize();
        
        if (success) {
            console.log('\n====================================================');
            console.log('✅ Global Sentinel initialization successful!');
            console.log('====================================================');
            
            // Verify audit log creation
            await verifyAuditLog();
            
            // Test cross-platform token verification
            console.log('\n🔄 Testing cross-platform token verification...');
            await sentinel.verifyCrossPlatformTokens();
            
            console.log('\n====================================================');
            console.log('🔒 Security Test Results:');
            console.log('----------------------------------------------------');
            console.log(`• Identity Binding: Enabled (${sentinel.identityProfile.owner_id})`);
            console.log(`• FaceID Verification: ${sentinel.identityVerified ? 'Success' : 'Failed'}`);
            console.log(`• Confidence Score: ${sentinel.verificationConfidence.toFixed(3)}`);
            console.log(`• Session Token: ${sentinel.sessionToken ? 'Generated' : 'Not generated'}`);
            console.log(`• Auto-lock: ${sentinel.securityPolicy.auto_lock_minutes} minutes`);
            console.log(`• Security Mode: ${sentinel.securityPolicy.strict_token_mode ? 'Strict' : 'Standard'}`);
            console.log('====================================================');
            
            // Simulate security scan after initialization
            console.log('\n🔍 Simulating security scan...');
            sentinel.performSecurityScan();
            
            console.log('\n✅ Test completed successfully!');
            console.log('✅ Global Sentinel is now actively monitoring the system');
            
        } else {
            console.error('\n❌ Global Sentinel initialization failed!');
        }
        
    } catch (error) {
        console.error(`\n❌ Test failed with error: ${error.message}`);
        process.exit(1);
    }
}

// Verify audit log creation
async function verifyAuditLog() {
    console.log('\n📝 Verifying audit log...');
    const auditLogPath = path.join('d:', 'PDF转网页', 'logs', 'sentinel_audit.json');
    
    if (fs.existsSync(auditLogPath)) {
        const auditData = fs.readFileSync(auditLogPath, 'utf8');
        const auditLog = JSON.parse(auditData);
        
        if (Array.isArray(auditLog) && auditLog.length > 0) {
            console.log(`✅ Audit log created with ${auditLog.length} entries`);
            console.log(`✅ Latest event: ${auditLog[0].event} (${auditLog[0].status})`);
            
            // Output expected example if FaceID verification event exists
            const faceIdEvent = auditLog.find(event => event.event === 'FaceID verified');
            if (faceIdEvent) {
                console.log('\n📊 Example Security Event:');
                console.log(JSON.stringify(faceIdEvent, null, 2));
            }
            
            return true;
        } else {
            console.error('❌ Audit log is empty or invalid');
            return false;
        }
    } else {
        console.error(`❌ Audit log not found at ${auditLogPath}`);
        return false;
    }
}

// Run the test
main().then(() => {
    // Keep the process running to simulate continuous monitoring
    console.log('\n⏱️  Test completed. Sentinel will continue monitoring (press Ctrl+C to stop)...');
    
    // Clean shutdown on Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\n🛑 Stopping Global Sentinel test...');
        process.exit(0);
    });
}).catch(err => {
    console.error('\n❌ Test execution failed:', err);
    process.exit(1);
});