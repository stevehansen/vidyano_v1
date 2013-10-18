using System.Collections.Generic;

namespace Vidyano
{
    public static class DataTypes
    {
        #region Constructor

        static DataTypes()
        {
            All = new HashSet<string>
                  {
                      String, ComboBox, MultiLineString, DropDown,
                      Int32, NullableInt32, UInt32, NullableUInt32,
                      Byte, NullableByte, SByte, NullableSByte,
                      Int16, NullableInt16, UInt16, NullableUInt16,
                      Int64, NullableInt64, UInt64, NullableUInt64,
                      Decimal, NullableDecimal,
                      Double, NullableDouble,
                      Single, NullableSingle,
                      Date, NullableDate,
                      DateTime, NullableDateTime,
                      DateTimeOffset, NullableDateTimeOffset,
                      Boolean, NullableBoolean, YesNo,
                      Reference, KeyValueList,
                      Guid, NullableGuid,
                      Image, BinaryFile
                  };

            Text = new HashSet<string>
                   {
                       String, ComboBox, MultiLineString, DropDown, Enum, Guid, NullableGuid
                   };

            Numeric = new HashSet<string>
                      {
                          Int32, NullableInt32, UInt32, NullableUInt32,
                          Byte, NullableByte, SByte, NullableSByte,
                          Int16, NullableInt16, UInt16, NullableUInt16,
                          Int64, NullableInt64, UInt64, NullableUInt64,
                          Decimal, NullableDecimal,
                          Double, NullableDouble,
                          Single, NullableSingle
                      };

            Dates = new HashSet<string>
                    {
                        Date, NullableDate,
                        DateTime, NullableDateTime,
                        DateTimeOffset, NullableDateTimeOffset
                    };
        }

        #endregion

        #region Fields

        public static readonly HashSet<string> All;

        public static readonly HashSet<string> Text;

        public static readonly HashSet<string> Numeric;

        public static readonly HashSet<string> Dates;

        #endregion

        #region Properties

        /// <summary>Represents the String data type.</summary>
        public const string String = "String";

        /// <summary>Represents the ComboBox data type.</summary>
        public const string ComboBox = "ComboBox";

        /// <summary>Represents the MultiLineString data type.</summary>
        public const string MultiLineString = "MultiLineString";

        /// <summary>Represents the DropDown data type.</summary>
        public const string DropDown = "DropDown";

        /// <summary>Represents the Int32 data type.</summary>
        public const string Int32 = "Int32";

        /// <summary>Represents the NullableInt32 data type.</summary>
        public const string NullableInt32 = "NullableInt32";

        /// <summary>Represents the UInt32 data type.</summary>
        public const string UInt32 = "UInt32";

        /// <summary>Represents the NullableUInt32 data type.</summary>
        public const string NullableUInt32 = "NullableUInt32";

        /// <summary>Represents the Byte data type.</summary>
        public const string Byte = "Byte";

        /// <summary>Represents the NullableByte data type.</summary>
        public const string NullableByte = "NullableByte";

        /// <summary>Represents the SByte data type.</summary>
        public const string SByte = "SByte";

        /// <summary>Represents the NullableSByte data type.</summary>
        public const string NullableSByte = "NullableSByte";

        /// <summary>Represents the Int16 data type.</summary>
        public const string Int16 = "Int16";

        /// <summary>Represents the NullableInt16 data type.</summary>
        public const string NullableInt16 = "NullableInt16";

        /// <summary>Represents the UInt16 data type.</summary>
        public const string UInt16 = "UInt16";

        /// <summary>Represents the NullableUInt16 data type.</summary>
        public const string NullableUInt16 = "NullableUInt16";

        /// <summary>Represents the Int64 data type.</summary>
        public const string Int64 = "Int64";

        /// <summary>Represents the NullableInt64 data type.</summary>
        public const string NullableInt64 = "NullableInt64";

        /// <summary>Represents the UInt64 data type.</summary>
        public const string UInt64 = "UInt64";

        /// <summary>Represents the NullableUInt64 data type.</summary>
        public const string NullableUInt64 = "NullableUInt64";

        /// <summary>Represents the Decimal data type.</summary>
        public const string Decimal = "Decimal";

        /// <summary>Represents the NullableDecimal data type.</summary>
        public const string NullableDecimal = "NullableDecimal";

        /// <summary>Represents the Double data type.</summary>
        public const string Double = "Double";

        /// <summary>Represents the NullableDouble data type.</summary>
        public const string NullableDouble = "NullableDouble";

        /// <summary>Represents the Single data type.</summary>
        public const string Single = "Single";

        /// <summary>Represents the NullableSingle data type.</summary>
        public const string NullableSingle = "NullableSingle";

        /// <summary>Represents the Date data type.</summary>
        public const string Date = "Date";

        /// <summary>Represents the NullableDate data type.</summary>
        public const string NullableDate = "NullableDate";

        /// <summary>Represents the DateTime data type.</summary>
        public const string DateTime = "DateTime";

        /// <summary>Represents the NullableDateTime data type.</summary>
        public const string NullableDateTime = "NullableDateTime";

        /// <summary>Represents the DateTimeOffset data type.</summary>
        public const string DateTimeOffset = "DateTimeOffset";

        /// <summary>Represents the NullableDateTimeOffset data type.</summary>
        public const string NullableDateTimeOffset = "NullableDateTimeOffset";

        /// <summary>Represents the Time data type.</summary>
        public const string Time = "Time";

        /// <summary>Represents the NullableTime data type.</summary>
        public const string NullableTime = "NullableTime";

        /// <summary>Represents the Boolean data type.</summary>
        public const string Boolean = "Boolean";

        /// <summary>Represents the NullableBoolean data type.</summary>
        public const string NullableBoolean = "NullableBoolean";

        /// <summary>Represents the YesNo data type.</summary>
        public const string YesNo = "YesNo";

        /// <summary>Represents the Reference data type.</summary>
        public const string Reference = "Reference";

        /// <summary>Represents the KeyValueList data type.</summary>
        public const string KeyValueList = "KeyValueList";

        /// <summary>Represents the Image data type.</summary>
        public const string Image = "Image";

        /// <summary>Represents the BinaryFile data type.</summary>
        public const string BinaryFile = "BinaryFile";

        /// <summary>Represents the Guid data type.</summary>
        public const string Guid = "Guid";

        /// <summary>Represents the NullableGuid data type.</summary>
        public const string NullableGuid = "NullableGuid";

        /// <summary>Represents the Enum data type.</summary>
        public const string Enum = "Enum";

        #endregion
    }
}