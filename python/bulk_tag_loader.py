#!/usr/bin/env python
# The copyright in this work is owned by LAB3 Pty Ltd.
# You must not use, copy or reproduce this work, or create other works based on this work, without LAB3 Pty Ltd’s consent.
# LAB3 Pty Ltd reserves all rights to take legal action for any breach of copyright.

import os
import pandas as pd
import numpy as np

import pyodbc
import sqlalchemy
import urllib
from sqlalchemy import create_engine

from datetime import datetime

import logging
import argparse

import sys
absolute_path = os.path.dirname(os.path.realpath(__file__))
os.chdir(absolute_path)
sys.path.append("../../Utilities")
import error_output


def load_data(log):

    # Create SQL Connection
    log.info("Creating SQL Connection")
    cnxn = pyodbc.connect('DRIVER={ODBC Driver 17 for SQL Server};SERVER=' +
                          os.environ['COMPUTERNAME']+';DATABASE=Assessments;Trusted_Connection=yes;')
    cursor = cnxn.cursor()

    quoted = urllib.parse.quote_plus('DRIVER={ODBC Driver 17 for SQL Server};SERVER=' +
                                     os.environ['COMPUTERNAME']+';DATABASE=Assessments;Trusted_Connection=yes;')
    engine = create_engine('mssql+pyodbc:///?odbc_connect={}'.format(quoted))
    connection = engine.connect().execution_options(autocommit=True)

    # Import Excel as dataframe
    log.info(f"Reading Excel file {args.input_file}")
    try:
        df = pd.read_excel(args.input_file, sheet_name='Tag List',
                           skiprows=2, usecols="B:E", index_col=None, parse_dates=True)
    except Exception as e:
        log.error(
            f'Something went wrong reading the Bulk Tag Template and the load aborted, please ensure you are using the latest unmodified template. Exiting script. Error was: {e}')
        cursor.execute(f"INSERT INTO dbo.Web_Notifications (is_show_popup, created_timestamp, created_by, last_edit_timestamp, last_edit_by, notification_category, notification_title, notification_description) VALUES (1, GETDATE(), 'admin@drmigrate.com.au', GETDATE(), 'admin_drmigrate.com.au', 'Tag Bulk Upload - Template Read Error', 'Template Read Error', 'Something went wrong reading the Tag Bulk Upload Template and the load aborted, please ensure you are using the latest unmodified template.');")
        cnxn.commit()
        error_output.sendError("bulk_tag_template")
        exit()

    # Check that Excel has not been modified
    log.info(f"Checking column headers have not been modified")
    map_cols = ['Tag Level', 'Application/Server Name', 'Tag Key', 'Tag Value']
    map_cols = np.array(map_cols)
    test_cols = np.array(df.columns)

    if len(test_cols) != len(map_cols):
        log.error('The column headers have been modified in the Bulk Tag Templateand the load aborted, please ensure you are using the latest unmodified template. Exiting script.')
        cursor.execute(f"INSERT INTO dbo.Web_Notifications (is_show_popup, created_timestamp, created_by, last_edit_timestamp, last_edit_by, notification_category, notification_title, notification_description) VALUES (1, GETDATE(), 'admin@drmigrate.com.au', GETDATE(), 'admin_drmigrate.com.au', 'Tag Bulk Upload - Modified Template', 'Modified Template', 'The column headers have been modified in the Tag Bulk Upload Template and the load aborted, please ensure you are using the latest unmodified template.');")
        cnxn.commit()
        error_output.sendError("bulk_tag_template")
        exit()

    if (test_cols == map_cols).all() == False:
        log.error('The column headers have been modified in the Bulk Tag Template and the load aborted, please ensure you are using the latest unmodified template. Exiting script.')
        cursor.execute(f"INSERT INTO dbo.Web_Notifications (is_show_popup, created_timestamp, created_by, last_edit_timestamp, last_edit_by, notification_category, notification_title, notification_description) VALUES (1, GETDATE(), 'admin@drmigrate.com.au', GETDATE(), 'admin_drmigrate.com.au', 'Tag Bulk Upload - Modified Template', 'Modified Template', 'The column headers have been modified in the Tag Bulk Upload Template and the load aborted, please ensure you are using the latest unmodified template.');")
        cnxn.commit()
        error_output.sendError("bulk_tag_template")
        exit()

    # Get required dataframes from SQL
    with engine.begin() as connection:
        connection.execute("TRUNCATE TABLE dbo.Tags;")
    app_guid_df = pd.read_sql(
        "SELECT application AS application_join, app_guid FROM dbo.Application WHERE application <> 'Unassociated'", engine)
    vm_guid_df = pd.read_sql(
        "SELECT UPPER(machine) AS machine_join, vm_guid FROM dbo.Virtual_Machines", engine)
    existing_app_tags_df = pd.read_sql(
        "SELECT tag_key AS existing_tag_key, related_id AS existing_app FROM dbo.Tags WHERE tag_type = 1", engine)
    existing_vm_tags_df = pd.read_sql(
        "SELECT tag_key AS existing_tag_key, related_id AS existing_machine FROM dbo.Tags WHERE tag_type = 2", engine)
    app_q_cols_df = pd.read_sql(
        "SELECT TOP 1 * FROM dbo.App_Questionnaire", engine)
    app_cols = app_q_cols_df.columns

    # Cleaning Excel file
    log.info("Cleaning Excel file")
    df = (
        df.rename(columns={"Tag Level": "tag_level", "Application/Server Name": "app_server_name",
                  "Tag Key": "tag_key", "Tag Value": "tag_value"})
        .drop_duplicates(subset=['app_server_name', 'tag_key'], keep='first')
        .dropna(how='any')
        .reset_index(drop=True)
    )
    # Create upper case name column so we can join on upper case machine names, for server level tags
    df['name_UPPER'] = df.app_server_name.str.upper()

    # Split Tags into App Tags and Server Tags
    log.info("Splitting tags into App and Server Tags")
    app_df = (
        df[df['tag_level'] == 'Application Tag']
        .rename(columns={"app_server_name": "application"})
        .merge(app_guid_df, left_on='application', right_on='application_join', how='inner')
        .drop('name_UPPER', axis=1)
    )

    vm_df = (
        df[df['tag_level'] == 'Server Tag']
        .rename(columns={"app_server_name": "machine"})
        .merge(vm_guid_df, left_on='name_UPPER', right_on='machine_join', how='inner')
        .drop('name_UPPER', axis=1)
    )
    df = df.drop('name_UPPER', axis=1)

    # Find which App Tags there are already columns for in the App_Questionnaire table and update that table
    log.debug(
        "Detecting tags which are App_Questionniare columns and updating the dbo.App_Questionnaire table")
    app_df['app_q_column'] = app_df['tag_key'].str.lower().str.replace(' ', '_')
    app_q_df = app_df[(app_df['app_q_column'].isin(app_cols))
                      & (app_df['app_q_column'] != 'app_guid')]
    app_df = app_df[~app_df['app_q_column'].isin(app_cols)]
    app_q_df.drop_duplicates(
        subset=['application', 'app_q_column'], keep='first', inplace=True)
    # app_q_df['tag_key'] = app_q_df['tag_key'].str.replace("--", '').str.replace(";", '').str.replace("'", "''")
    log.info(f'Updating dbo.App_Questionnaire values')
    with engine.begin() as connection:
        for index, row in app_q_df.iterrows():
            try:
                connection.execute(f"UPDATE dbo.App_Questionnaire SET {row.app_q_column} = ? WHERE app_guid = ?", row.tag_value, row.app_guid)
            except Exception as e:
                log.error(f'Error updating {row.app_q_column} in dbo.App_Questionnaire to {row.tag_value} for {row.app_guid}. Error was: {e}')

    # Update App Tags table, splitting into update and insert
    log.info(f'Updating App Tags')
    app_df = pd.merge(app_df, existing_app_tags_df, left_on=['app_guid', 'tag_key'], right_on=[
                      'existing_app', 'existing_tag_key'], how='left', indicator=True)
    with engine.begin() as connection:
        for index, row in app_df.iterrows():
            if row._merge == 'both':
                try:
                    connection.execute(
                        "UPDATE dbo.Tags SET tag_value = ? WHERE tag_type = 1 AND tag_key = ? AND related_id = ?", row.tag_value, row.tag_key, row.app_guid)
                except Exception as e:
                    log.error(f'Error updating {row.tag_key} in dbo.Tags to {row.tag_value} for application {row.application}. Error was: {e}')
            elif row._merge == 'left_only':
                try:
                    connection.execute(
                        "INSERT INTO dbo.Tags (related_id, tag_type, tag_key, tag_value, last_edit_by, last_edit_timestamp) VALUES (?, 1, ?, ?, 'admin@drmigrate.com.au', GETDATE())", row.app_guid, row.tag_key, row.tag_value)
                except Exception as e:
                    log.error(f'Error inserting {row.tag_key} in dbo.Tags to {row.tag_value} for application {row.application}. Error was: {e}')

    # Update VM Tags table, splitting into update and insert
    log.info(f'Updating Server Tags')
    vm_df = pd.merge(vm_df, existing_vm_tags_df, left_on=['vm_guid', 'tag_key'], right_on=[
                     'existing_machine', 'existing_tag_key'], how='left', indicator=True)
    with engine.begin() as connection:
        for index, row in vm_df.iterrows():
            if row._merge == 'both':
                try:
                    connection.execute(
                        "UPDATE dbo.Tags SET tag_value = ? WHERE tag_type = 2 AND tag_key = ? AND related_id = ?", row.tag_value, row.tag_key, row.vm_guid)
                except Exception as e:
                    log.error(f'Error updating {row.tag_key} in dbo.Tags to {row.tag_value} for server {row.machine}. Error was: {e}')
            elif row._merge == 'left_only':
                try:
                    connection.execute(
                        "INSERT INTO dbo.Tags (related_id, tag_type, tag_key, tag_value, last_edit_by, last_edit_timestamp) VALUES (?, 2, ?, ?, 'admin@drmigrate.com.au', GETDATE())", row.vm_guid, row.tag_key, row.tag_value)
                except Exception as e:
                    log.error(f'Error inserting {row.tag_key} in dbo.Tags to {row.tag_value} for server {row.machine}. Error was: {e}')

    dt = datetime.today().strftime('%d%m%Y_%H_%M_%S')

    # Move file to archive
    if not os.path.exists('C:/Excel_Uploads/Bulk_Tags_Archive/'):
        log.info(f'Creating an archive folder for the ingested Bulk Tags Template')
        os.makedirs('C:/Excel_Uploads/Bulk_Tags_Archive/')

    log.info(f'Moving the Bulk Tags Template into the archive folder')
    os.rename(args.input_file,
              'C:/Excel_Uploads/Bulk_Tags_Archive/completed_bulk_tag_' + dt + '.xlsx')


def set_logging():
    # create logger
    level = "INFO"
    if args.verbose:
        print("sss")
        level = "DEBUG"
    logger = logging.getLogger("Dr Migrate Logging")
    logger.setLevel(level)

    # create console handler and set level to debug
    ch = logging.StreamHandler()
    ch.setLevel(level)

    # create formatter
    formatter = logging.Formatter(
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s")

    # add formatter to ch
    ch.setFormatter(formatter)

    # add ch to logger
    logger.addHandler(ch)
    return logger


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Dr Migrate Bulk Tag Loader.")
    parser.add_argument(
        "--input-file",
        dest="input_file",
        required=True,
        help="Path to Input Excel File, i.e. C:/Documents/Bulk Tag Template v1.0.xlsx",
    )

    parser.add_argument(
        "--verbose",
        dest="verbose",
        action="store_true",
        help="Verbose Logging",
    )
    args = parser.parse_args()

    log = set_logging()
    load_data(log)