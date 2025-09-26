sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/comp/valuehelpdialog/ValueHelpDialog",
    "sap/m/ColumnListItem",
    "sap/m/Text"
], function (Controller, JSONModel, MessageToast, MessageBox, ValueHelpDialog, ColumnListItem, Text) {
    "use strict";

    return Controller.extend("soheader.controller.View1", {

        onInit: function () {
            const oModel = new JSONModel({
                salesOrder: "",
                salesOrderData: {},
                suggestedOrders: []
            });
            this.getView().setModel(oModel, "view");
        },

        // Called when Enter is pressed or suggestion is selected
        onCheckSalesOrder: function () {
            const oViewModel = this.getView().getModel("view");
            const sOrder = oViewModel.getProperty("/salesOrder");

            if (!sOrder) {
                MessageToast.show("Please enter a Sales Order");
                return;
            }

            const oODataModel = this.getView().getModel(); // default OData model
            if (!oODataModel) {
                MessageToast.show("OData model not found!");
                return;
            }

            const sPath = `/ZC_SOHEADER('${sOrder}')`;

            oODataModel.read(sPath, {
                success: function (oData) {
                    const oResult = oData && oData.results ? oData.results[0] : oData;

                    if (!oResult) {
                        MessageBox.error("Sales Order not found");
                        oViewModel.setProperty("/salesOrderData", {});
                    } else {
                        oViewModel.setProperty("/salesOrderData", oResult);

                        // Navigate to details page
                        this.getView().byId("mainPage").setVisible(false);
                        this.getView().byId("detailsPage").setVisible(true);
                    }
                }.bind(this),
                error: function () {
                    MessageBox.error("Sales Order does not exist");
                    oViewModel.setProperty("/salesOrderData", {});
                }
            });
        },

        // Fetch suggestions dynamically as user types
        onSalesOrderLiveChange: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oViewModel = this.getView().getModel("view");

            if (!sValue) {
                oViewModel.setProperty("/suggestedOrders", []);
                return;
            }

            const oODataModel = this.getView().getModel(); // default OData model
            const sPath = "/ZC_SOHEADER";

            oODataModel.read(sPath, {
                urlParameters: {
                    "$filter": `substringof('${encodeURIComponent(sValue)}', SalesOrder)`,
                    "$top": "10"
                },
                success: function (oData) {
                    const aSuggestions = oData.results.map(item => ({ SalesOrder: item.SalesOrder }));
                    oViewModel.setProperty("/suggestedOrders", aSuggestions);
                },
                error: function () {
                    oViewModel.setProperty("/suggestedOrders", []);
                }
            });
        },

        // F4 Value Help for Sales Order
        onSalesOrderValueHelp: function () {
            const oView = this.getView();
            const oODataModel = oView.getModel(); // default OData model
            const oViewModel = oView.getModel("view");

            if (!this._oValueHelpDialog) {

                // Create FilterBar
                const oFilterBar = new sap.ui.comp.filterbar.FilterBar({
                    search: function () {
                        const aFilters = [];

                        const sSalesOrder = oView.byId("fSalesOrder").getValue();
                        if (sSalesOrder) aFilters.push(new sap.ui.model.Filter("SalesOrder", sap.ui.model.FilterOperator.Contains, sSalesOrder));

                        const sSoldToParty = oView.byId("fSoldToParty").getValue();
                        if (sSoldToParty) aFilters.push(new sap.ui.model.Filter("SoldToParty", sap.ui.model.FilterOperator.Contains, sSoldToParty));

                        const sPOCustomer = oView.byId("fPOCustomer").getValue();
                        if (sPOCustomer) aFilters.push(new sap.ui.model.Filter("PurchaseOrderByCustomer", sap.ui.model.FilterOperator.Contains, sPOCustomer));

                        const sCreationDate = oView.byId("fCreationDate").getValue();
                        if (sCreationDate) aFilters.push(new sap.ui.model.Filter("CreationDate", sap.ui.model.FilterOperator.EQ, sCreationDate));

                        const sBillingCode = oView.byId("fBillingCode").getValue();
                        if (sBillingCode) aFilters.push(new sap.ui.model.Filter("BillingCompanyCode", sap.ui.model.FilterOperator.Contains, sBillingCode));

                        const sSalesOrg = oView.byId("fSalesOrg").getValue();
                        if (sSalesOrg) aFilters.push(new sap.ui.model.Filter("SalesOrganization", sap.ui.model.FilterOperator.Contains, sSalesOrg));

                        // Apply filters to table binding
                        const oTable = this._oValueHelpDialog.getTable();
                        const oBinding = oTable.getBinding("items");
                        oBinding.filter(aFilters);
                    }.bind(this)
                });

                // Add filter fields
                oFilterBar.addFilterItem(new sap.ui.comp.filterbar.FilterItem({
                    name: "SalesOrder",
                    label: "Sales Order",
                    control: new sap.m.Input(this.createId("fSalesOrder"))
                }));
                oFilterBar.addFilterItem(new sap.ui.comp.filterbar.FilterItem({
                    name: "SoldToParty",
                    label: "Sold To Party",
                    control: new sap.m.Input(this.createId("fSoldToParty"))
                }));
                oFilterBar.addFilterItem(new sap.ui.comp.filterbar.FilterItem({
                    name: "PurchaseOrderByCustomer",
                    label: "PO Customer",
                    control: new sap.m.Input(this.createId("fPOCustomer"))
                }));
                oFilterBar.addFilterItem(new sap.ui.comp.filterbar.FilterItem({
                    name: "CreationDate",
                    label: "Creation Date",
                    control: new sap.m.DatePicker(this.createId("fCreationDate"))
                }));
                oFilterBar.addFilterItem(new sap.ui.comp.filterbar.FilterItem({
                    name: "BillingCompanyCode",
                    label: "Billing Code",
                    control: new sap.m.Input(this.createId("fBillingCode"))
                }));
                oFilterBar.addFilterItem(new sap.ui.comp.filterbar.FilterItem({
                    name: "SalesOrganization",
                    label: "Sales Org",
                    control: new sap.m.Input(this.createId("fSalesOrg"))
                }));

                // Create ValueHelpDialog
                this._oValueHelpDialog = new ValueHelpDialog({
                    supportMultiselect: false,
                    key: "SalesOrder",
                    descriptionKey: "SalesOrder",
                    title: "Select Sales Order",
                    filterBar: oFilterBar,
                    ok: function (oEvent) {
                        const aTokens = oEvent.getParameter("tokens");
                        if (aTokens.length > 0) {
                            oViewModel.setProperty("/salesOrder", aTokens[0].getKey());
                            this.onCheckSalesOrder(); // auto-fetch details
                        }
                        this._oValueHelpDialog.close();
                    }.bind(this),
                    cancel: function () {
                        this._oValueHelpDialog.close();
                    }.bind(this)
                });

                // Multi-column table inside dialog
                const oTable = new sap.m.Table({
                    columns: [
                        new sap.m.Column({ header: new sap.m.Label({ text: "Sales Order" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Sold To Party" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "PO Customer" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Creation Date" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Billing Code" }) }),
                        new sap.m.Column({ header: new sap.m.Label({ text: "Sales Org" }) })
                    ],
                    items: {
                        path: "/results",
                        template: new ColumnListItem({
                            cells: [
                                new Text({ text: "{SalesOrder}" }),
                                new Text({ text: "{SoldToParty}" }),
                                new Text({ text: "{PurchaseOrderByCustomer}" }),
                                new Text({ text: "{CreationDate}" }),
                                new Text({ text: "{BillingCompanyCode}" }),
                                new Text({ text: "{SalesOrganization}" })
                            ]
                        })
                    }
                });

                this._oValueHelpDialog.setTable(oTable);
                oView.addDependent(this._oValueHelpDialog);
            }

            // Fetch Sales Orders from OData
            oODataModel.read("/ZC_SOHEADER", {
                urlParameters: { "$top": "100" }, // initial top records
                success: function (oData) {
                    const oDialogModel = new JSONModel(oData);
                    this._oValueHelpDialog.setModel(oDialogModel);
                    this._oValueHelpDialog.open();
                }.bind(this),
                error: function () {
                    MessageBox.error("Error fetching Sales Orders for F4");
                }
            });
        },

        onNavBack: function () {
            this.getView().byId("detailsPage").setVisible(false);
            this.getView().byId("mainPage").setVisible(true);

            const oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/salesOrder", "");
            oViewModel.setProperty("/salesOrderData", {});
        }

    });
});
