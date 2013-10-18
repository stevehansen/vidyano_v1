using System;
using System.Runtime.InteropServices.WindowsRuntime;
using Windows.ApplicationModel;
using Windows.Security.Cryptography;
using Windows.Security.Cryptography.Core;

namespace Vidyano
{
    public sealed class StoreBackgroundHooks : Hooks
    {
        public static readonly string VaultCredentialsName = string.Format("Vidyano.{0}", Package.Current.Id.Name); 
        
        private CryptographicKey timestampKey;
        private readonly AsymmetricKeyAlgorithmProvider asym = AsymmetricKeyAlgorithmProvider.OpenAlgorithm(AsymmetricAlgorithmNames.RsaSignPkcs1Sha256);

        public void InitializeUniqueIdKeyPair(string keypair)
        {
            timestampKey = asym.ImportKeyPair(Convert.FromBase64String(keypair).AsBuffer());
            UniqueId = Convert.ToBase64String(timestampKey.ExportPublicKey(CryptographicPublicKeyBlobType.Capi1PublicKey).ToArray());
        }

        internal override string GetSignedTimeStamp()
        {
            var deviceTime = Service.ToServiceString(DateTimeOffset.Now);
            var buf = CryptographicBuffer.ConvertStringToBinary(deviceTime, BinaryStringEncoding.Utf8);
            var signedData = CryptographicEngine.Sign(timestampKey, buf).ToArray();

            return deviceTime + ";" + Convert.ToBase64String(signedData);
        }
    }
}